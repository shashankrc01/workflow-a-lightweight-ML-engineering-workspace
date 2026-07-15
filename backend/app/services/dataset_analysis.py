"""
Dataset Health Report generator.

Given a raw, ML-ready CSV (features + target already engineered), this module
inspects it and produces a structured report: summary stats, detected issues,
and plain-English recommendations. It never modifies the dataset - the user
decides what preprocessing to apply based on this report.
"""
from __future__ import annotations

import pandas as pd
import numpy as np

from app.config import HIGH_CARDINALITY_THRESHOLD, CLASS_IMBALANCE_THRESHOLD


def _guess_target_column(df: pd.DataFrame) -> str:
    """Heuristic: assume the last column is the target unless it looks like an ID."""
    last_col = df.columns[-1]
    return last_col


def _detect_problem_type(series: pd.Series) -> str:
    n_unique = series.nunique(dropna=True)
    if pd.api.types.is_numeric_dtype(series) and n_unique > 20:
        return "regression"
    return "classification"


def _detect_timestamp_columns(df: pd.DataFrame) -> list[str]:
    candidates = []
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            candidates.append(col)
            continue
        if df[col].dtype == object:
            sample = df[col].dropna().head(20)
            if len(sample) == 0:
                continue
            try:
                parsed = pd.to_datetime(sample, errors="coerce", format="mixed")
                if parsed.notna().mean() > 0.9:
                    candidates.append(col)
            except Exception:
                pass
    return candidates


def _detect_id_like_columns(df: pd.DataFrame) -> list[str]:
    ids = []
    for col in df.columns:
        if df[col].nunique(dropna=True) == len(df) and len(df) > 0:
            if "id" in col.lower() or df[col].dtype == object:
                ids.append(col)
    return ids


def analyze_dataset(filepath: str, target_column: str | None = None) -> dict:
    df = pd.read_csv(filepath)

    if target_column is None or target_column not in df.columns:
        target_column = _guess_target_column(df)

    n_rows, n_cols = df.shape
    feature_cols = [c for c in df.columns if c != target_column]

    dtypes = {c: str(df[c].dtype) for c in df.columns}
    numeric_cols = [c for c in feature_cols if pd.api.types.is_numeric_dtype(df[c])]
    categorical_cols = [c for c in feature_cols if not pd.api.types.is_numeric_dtype(df[c])]

    missing_counts = df.isna().sum()
    missing_report = {
        c: {"count": int(missing_counts[c]), "pct": round(float(missing_counts[c]) / n_rows * 100, 2)}
        for c in df.columns if missing_counts[c] > 0
    }

    duplicate_rows = int(df.duplicated().sum())

    constant_cols = [c for c in feature_cols if df[c].nunique(dropna=True) <= 1]
    high_cardinality_cols = [
        c for c in categorical_cols if df[c].nunique(dropna=True) > HIGH_CARDINALITY_THRESHOLD
    ]
    timestamp_cols = _detect_timestamp_columns(df[feature_cols])
    id_like_cols = _detect_id_like_columns(df[feature_cols])

    problem_type = _detect_problem_type(df[target_column])

    class_distribution = None
    imbalance_warning = None
    if problem_type == "classification":
        counts = df[target_column].value_counts(dropna=True)
        class_distribution = {str(k): int(v) for k, v in counts.items()}
        minority_share = counts.min() / counts.sum()
        if minority_share < CLASS_IMBALANCE_THRESHOLD:
            imbalance_warning = (
                f"Minority class represents only {minority_share * 100:.1f}% of rows. "
                "Consider class weighting, resampling, or stratified splitting."
            )

    target_stats = None
    if problem_type == "regression":
        target_stats = {
            "min": float(df[target_column].min()),
            "max": float(df[target_column].max()),
            "mean": float(df[target_column].mean()),
            "std": float(df[target_column].std()),
        }

    # Simple leakage heuristic: any feature almost perfectly correlated with the
    # target, or a feature name that looks suspiciously like a target derivative.
    leakage_suspects = []
    if problem_type == "regression":
        for c in numeric_cols:
            try:
                corr = df[[c, target_column]].dropna().corr().iloc[0, 1]
                if abs(corr) > 0.98:
                    leakage_suspects.append({"column": c, "correlation": round(float(corr), 4)})
            except Exception:
                pass
    for c in feature_cols:
        lc = c.lower()
        if any(tok in lc for tok in ["target", "label", "outcome", "leak"]):
            leakage_suspects.append({"column": c, "reason": "suspicious column name"})

    issues = []
    if missing_report:
        issues.append(f"{len(missing_report)} column(s) contain missing values.")
    if duplicate_rows:
        issues.append(f"{duplicate_rows} duplicate row(s) detected.")
    if categorical_cols:
        issues.append(f"{len(categorical_cols)} categorical column(s) require encoding.")
    if constant_cols:
        issues.append(f"{len(constant_cols)} constant column(s) with no predictive value: {constant_cols}.")
    if high_cardinality_cols:
        issues.append(f"{len(high_cardinality_cols)} high-cardinality categorical column(s): {high_cardinality_cols}.")
    if timestamp_cols:
        issues.append(f"Possible timestamp column(s) detected: {timestamp_cols}. Consider deriving features (day, month, etc).")
    if id_like_cols:
        issues.append(f"Possible ID-like column(s) that should probably be dropped before training: {id_like_cols}.")
    if imbalance_warning:
        issues.append(imbalance_warning)
    if leakage_suspects:
        issues.append(f"Possible data leakage detected in: {[s['column'] for s in leakage_suspects]}.")

    recommendations = []
    if missing_report:
        recommendations.append("Choose a missing-value strategy (mean/median/most_frequent imputation, or drop rows).")
    if categorical_cols:
        recommendations.append("Choose a categorical encoding strategy (one-hot for low cardinality, ordinal otherwise).")
    if numeric_cols:
        recommendations.append("Apply feature scaling (standardization or min-max) especially for distance-based or gradient-based models.")
    if constant_cols or id_like_cols:
        recommendations.append("Drop constant and ID-like columns before training - they add noise or leak row identity.")
    if problem_type == "classification" and imbalance_warning:
        recommendations.append("Use stratified train/test split and consider class_weight='balanced' where supported.")

    return {
        "target_column": target_column,
        "problem_type": problem_type,
        "summary": {
            "rows": n_rows,
            "columns": n_cols,
            "numeric_features": len(numeric_cols),
            "categorical_features": len(categorical_cols),
            "duplicate_rows": duplicate_rows,
            "missing_value_columns": len(missing_report),
        },
        "dtypes": dtypes,
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "missing_values": missing_report,
        "constant_columns": constant_cols,
        "high_cardinality_columns": high_cardinality_cols,
        "timestamp_columns": timestamp_cols,
        "id_like_columns": id_like_cols,
        "class_distribution": class_distribution,
        "target_stats": target_stats,
        "leakage_suspects": leakage_suspects,
        "issues": issues,
        "recommendations": recommendations,
    }
