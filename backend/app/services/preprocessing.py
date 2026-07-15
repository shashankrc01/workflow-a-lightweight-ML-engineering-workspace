"""
Builds a scikit-learn preprocessing ColumnTransformer from a user-selected
PreprocessingConfig. The resulting transformer is combined with the chosen
estimator into a single Pipeline, so one joblib file fully reproduces
training-time behaviour at inference time.
"""
from __future__ import annotations

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import (
    OneHotEncoder, OrdinalEncoder, StandardScaler, MinMaxScaler
)


def split_columns(df: pd.DataFrame, target_column: str):
    feature_cols = [c for c in df.columns if c != target_column]
    numeric_cols = [c for c in feature_cols if pd.api.types.is_numeric_dtype(df[c])]
    categorical_cols = [c for c in feature_cols if c not in numeric_cols]
    return feature_cols, numeric_cols, categorical_cols


def build_preprocessor(df: pd.DataFrame, config) -> ColumnTransformer:
    """config is a PreprocessingConfig (pydantic model or plain dict-like access)."""
    _, numeric_cols, categorical_cols = split_columns(df, config.target_column)

    # --- numeric branch ---
    numeric_steps = []
    if config.missing_value_strategy != "drop_rows":
        strategy = config.missing_value_strategy if config.missing_value_strategy in (
            "mean", "median", "most_frequent"
        ) else "mean"
        numeric_steps.append(("imputer", SimpleImputer(strategy=strategy)))
    else:
        numeric_steps.append(("imputer", SimpleImputer(strategy="mean")))

    if config.scaling == "standard":
        numeric_steps.append(("scaler", StandardScaler()))
    elif config.scaling == "minmax":
        numeric_steps.append(("scaler", MinMaxScaler()))

    numeric_pipeline = Pipeline(numeric_steps) if numeric_steps else "passthrough"

    # --- categorical branch ---
    categorical_steps = [("imputer", SimpleImputer(strategy="most_frequent"))]
    if config.categorical_encoding == "onehot":
        categorical_steps.append(("encoder", OneHotEncoder(handle_unknown="ignore")))
    elif config.categorical_encoding == "ordinal":
        categorical_steps.append(
            ("encoder", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1))
        )
    categorical_pipeline = Pipeline(categorical_steps)

    transformers = []
    if numeric_cols:
        transformers.append(("numeric", numeric_pipeline, numeric_cols))
    if categorical_cols:
        transformers.append(("categorical", categorical_pipeline, categorical_cols))

    preprocessor = ColumnTransformer(transformers=transformers, remainder="drop")
    return preprocessor
