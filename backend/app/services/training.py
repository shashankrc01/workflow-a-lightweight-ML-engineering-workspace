"""
Training engine.

Given a dataframe, a preprocessing config, and an algorithm + hyperparameters,
this module builds a full sklearn Pipeline (preprocessing + model), trains it,
evaluates it, and returns everything the Experiment Tracker needs to persist:
metrics, confusion matrix, feature importance, and the fitted pipeline itself
(so it can be joblib-dumped for later inference).
"""
from __future__ import annotations

import time
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, mean_absolute_error, mean_squared_error, r2_score,
)

from app.services.preprocessing import build_preprocessor

# ---------------------------------------------------------------------------
# Algorithm registry. Only algorithms that resolve to an importable class are
# exposed via /algorithms, so this degrades gracefully if optional boosting
# libraries (xgboost/lightgbm/catboost) are not installed.
# ---------------------------------------------------------------------------

def _try_import(fn):
    try:
        return fn()
    except ImportError:
        return None


def _classification_registry():
    from sklearn.linear_model import LogisticRegression
    from sklearn.tree import DecisionTreeClassifier
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.svm import SVC
    from sklearn.neighbors import KNeighborsClassifier
    from sklearn.naive_bayes import GaussianNB

    registry = {
        "logistic_regression": LogisticRegression,
        "decision_tree": DecisionTreeClassifier,
        "random_forest": RandomForestClassifier,
        "svm": SVC,
        "knn": KNeighborsClassifier,
        "naive_bayes": GaussianNB,
        "gradient_boosting": GradientBoostingClassifier,
    }

    xgb = _try_import(lambda: __import__("xgboost").XGBClassifier)
    if xgb:
        registry["xgboost"] = xgb
    lgbm = _try_import(lambda: __import__("lightgbm").LGBMClassifier)
    if lgbm:
        registry["lightgbm"] = lgbm
    cb = _try_import(lambda: __import__("catboost").CatBoostClassifier)
    if cb:
        registry["catboost"] = cb
    return registry


def _regression_registry():
    from sklearn.linear_model import LinearRegression
    from sklearn.tree import DecisionTreeRegressor
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.svm import SVR
    from sklearn.neighbors import KNeighborsRegressor

    registry = {
        "linear_regression": LinearRegression,
        "decision_tree": DecisionTreeRegressor,
        "random_forest": RandomForestRegressor,
        "svm": SVR,
        "knn": KNeighborsRegressor,
        "gradient_boosting": GradientBoostingRegressor,
    }

    xgb = _try_import(lambda: __import__("xgboost").XGBRegressor)
    if xgb:
        registry["xgboost"] = xgb
    lgbm = _try_import(lambda: __import__("lightgbm").LGBMRegressor)
    if lgbm:
        registry["lightgbm"] = lgbm
    cb = _try_import(lambda: __import__("catboost").CatBoostRegressor)
    if cb:
        registry["catboost"] = cb
    return registry


def available_algorithms() -> dict:
    return {
        "classification": sorted(_classification_registry().keys()),
        "regression": sorted(_regression_registry().keys()),
    }


def _get_estimator_class(algorithm: str, problem_type: str):
    registry = _classification_registry() if problem_type == "classification" else _regression_registry()
    if algorithm not in registry:
        raise ValueError(
            f"Algorithm '{algorithm}' is not available for problem type '{problem_type}'. "
            f"Available: {sorted(registry.keys())}"
        )
    return registry[algorithm]


def _feature_names_out(preprocessor, numeric_cols, categorical_cols) -> list[str]:
    try:
        return list(preprocessor.get_feature_names_out())
    except Exception:
        return numeric_cols + categorical_cols


def train_experiment(df: pd.DataFrame, algorithm: str, problem_type: str,
                      hyperparameters: dict, config) -> dict:
    """
    Trains a Pipeline(preprocessing + estimator) on df and returns a result
    dict with the fitted pipeline plus everything needed for the experiment
    record.
    """
    start = time.time()

    if config.missing_value_strategy == "drop_rows":
        df = df.dropna()

    y = df[config.target_column]
    X = df.drop(columns=[config.target_column])

    stratify = y if problem_type == "classification" else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=config.test_size, random_state=config.random_state, stratify=stratify
    )

    preprocessor = build_preprocessor(df, config)
    estimator_cls = _get_estimator_class(algorithm, problem_type)

    # random_state passthrough for estimators that support it
    hp = dict(hyperparameters or {})
    try:
        if "random_state" not in hp and "random_state" in estimator_cls().get_params():
            hp["random_state"] = config.random_state
    except Exception:
        pass

    estimator = estimator_cls(**hp)
    pipeline = Pipeline([("preprocessor", preprocessor), ("model", estimator)])

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    metrics = {}
    conf_matrix = None
    if problem_type == "classification":
        average = "binary" if y.nunique() == 2 else "weighted"
        metrics = {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "precision": round(float(precision_score(y_test, y_pred, average=average, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, y_pred, average=average, zero_division=0)), 4),
            "f1_score": round(float(f1_score(y_test, y_pred, average=average, zero_division=0)), 4),
        }
        labels = sorted(y.unique().tolist(), key=str)
        cm = confusion_matrix(y_test, y_pred, labels=labels)
        conf_matrix = {"labels": [str(l) for l in labels], "matrix": cm.tolist()}
    else:
        mse = mean_squared_error(y_test, y_pred)
        metrics = {
            "mae": round(float(mean_absolute_error(y_test, y_pred)), 4),
            "rmse": round(float(np.sqrt(mse)), 4),
            "r2_score": round(float(r2_score(y_test, y_pred)), 4),
        }

    if config.cv_folds and config.cv_folds > 1:
        scoring = "accuracy" if problem_type == "classification" else "r2"
        cv_scores = cross_val_score(pipeline, X, y, cv=config.cv_folds, scoring=scoring)
        metrics["cv_mean"] = round(float(cv_scores.mean()), 4)
        metrics["cv_std"] = round(float(cv_scores.std()), 4)

    # Feature importance (if the estimator exposes it)
    feature_importance = None
    model = pipeline.named_steps["model"]
    _, numeric_cols, categorical_cols = _split_cols(df, config.target_column)
    feature_names = _feature_names_out(pipeline.named_steps["preprocessor"], numeric_cols, categorical_cols)
    try:
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            feature_importance = sorted(
                [{"feature": f, "importance": round(float(i), 5)}
                 for f, i in zip(feature_names, importances)],
                key=lambda d: -d["importance"]
            )[:25]
        elif hasattr(model, "coef_"):
            coefs = np.ravel(model.coef_)
            if len(coefs) == len(feature_names):
                feature_importance = sorted(
                    [{"feature": f, "importance": round(float(abs(c)), 5)}
                     for f, c in zip(feature_names, coefs)],
                    key=lambda d: -d["importance"]
                )[:25]
    except Exception:
        feature_importance = None

    duration = time.time() - start

    return {
        "pipeline": pipeline,
        "metrics": metrics,
        "confusion_matrix": conf_matrix,
        "feature_importance": feature_importance,
        "training_duration_seconds": round(duration, 3),
    }


def _split_cols(df, target_column):
    from app.services.preprocessing import split_columns
    return split_columns(df, target_column)
