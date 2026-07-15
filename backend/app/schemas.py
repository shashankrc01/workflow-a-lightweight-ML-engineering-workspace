import datetime as dt
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


# ---------- Project ----------
class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str
    created_at: dt.datetime
    active_experiment_id: Optional[int] = None


# ---------- Dataset ----------
class DatasetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    filename: str
    version: int
    uploaded_at: dt.datetime
    health_report: dict[str, Any]


class DatasetRename(BaseModel):
    filename: str


# ---------- Preprocessing config ----------
class PreprocessingConfig(BaseModel):
    target_column: str
    missing_value_strategy: str = "mean"        # mean | median | most_frequent | drop_rows
    categorical_encoding: str = "onehot"        # onehot | ordinal | none
    scaling: str = "standard"                   # standard | minmax | none
    test_size: float = 0.2
    cv_folds: int = 0                            # 0 disables cross validation
    random_state: int = 42


# ---------- Training ----------
class TrainRequest(BaseModel):
    dataset_id: int
    algorithm: str
    hyperparameters: dict[str, Any] = {}
    preprocessing: PreprocessingConfig
    notes: str = ""


class ExperimentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    dataset_id: int
    algorithm: str
    problem_type: str
    hyperparameters: dict[str, Any]
    preprocessing_config: dict[str, Any]
    metrics: dict[str, Any]
    confusion_matrix: Optional[Any] = None
    feature_importance: Optional[Any] = None
    training_duration_seconds: float
    notes: str
    status: str
    error_message: Optional[str] = None
    created_at: dt.datetime


# ---------- Deployment ----------
class DeployRequest(BaseModel):
    experiment_id: int
    notes: str = ""


class DeploymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    experiment_id: int
    status: str
    deployed_at: dt.datetime
    notes: str


# ---------- Inference ----------
class InferenceRequest(BaseModel):
    # list of records, each record is a dict of feature_name -> value
    records: list[dict[str, Any]]


class InferenceResponse(BaseModel):
    predictions: list[Any]
    experiment_id: int
    model_algorithm: str
