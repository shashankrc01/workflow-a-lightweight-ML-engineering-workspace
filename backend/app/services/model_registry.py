"""
Model Registry.

Trained pipelines (preprocessing + estimator, fully fitted) are versioned and
stored on local disk with joblib. This is intentionally simple - a natural
extension point is swapping this for cloud object storage (S3/GCS) later
without touching the training or inference services, since they only depend
on this module's save/load interface.
"""
from __future__ import annotations

import joblib
from pathlib import Path

from app.config import MODELS_DIR


def save_model(pipeline, project_id: int, experiment_id: int) -> str:
    path = MODELS_DIR / f"project_{project_id}" / f"experiment_{experiment_id}.joblib"
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, path)
    return str(path)


def load_model(model_path: str):
    if not Path(model_path).exists():
        raise FileNotFoundError(f"Model artifact not found at {model_path}")
    return joblib.load(model_path)
