import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.services.training import train_experiment, available_algorithms
from app.services.model_registry import save_model

router = APIRouter(tags=["experiments"])


@router.get("/algorithms")
def get_algorithms():
    """Algorithms available right now (optional boosting libs included only if installed)."""
    return available_algorithms()


@router.post("/projects/{project_id}/train", response_model=schemas.ExperimentOut)
def train(project_id: int, payload: schemas.TrainRequest, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    dataset = db.get(models.Dataset, payload.dataset_id)
    if not dataset or dataset.project_id != project_id:
        raise HTTPException(404, "Dataset not found in this project")

    problem_type = dataset.health_report.get("problem_type", "classification")

    df = pd.read_csv(dataset.filepath)
    if payload.preprocessing.target_column not in df.columns:
        raise HTTPException(400, f"target_column '{payload.preprocessing.target_column}' not in dataset columns")

    experiment = models.Experiment(
        project_id=project_id,
        dataset_id=dataset.id,
        algorithm=payload.algorithm,
        problem_type=problem_type,
        hyperparameters=payload.hyperparameters,
        preprocessing_config=payload.preprocessing.model_dump(),
        notes=payload.notes,
        status="running",
    )
    db.add(experiment)
    db.commit()
    db.refresh(experiment)

    try:
        result = train_experiment(
            df=df,
            algorithm=payload.algorithm,
            problem_type=problem_type,
            hyperparameters=payload.hyperparameters,
            config=payload.preprocessing,
        )
        model_path = save_model(result["pipeline"], project_id, experiment.id)

        experiment.metrics = result["metrics"]
        experiment.confusion_matrix = result["confusion_matrix"]
        experiment.feature_importance = result["feature_importance"]
        experiment.training_duration_seconds = result["training_duration_seconds"]
        experiment.model_path = model_path
        experiment.status = "completed"
    except Exception as e:
        experiment.status = "failed"
        experiment.error_message = str(e)
        db.commit()
        db.refresh(experiment)
        raise HTTPException(500, f"Training failed: {e}")

    db.commit()
    db.refresh(experiment)
    return experiment


@router.get("/projects/{project_id}/experiments", response_model=list[schemas.ExperimentOut])
def list_experiments(project_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Experiment)
        .filter_by(project_id=project_id)
        .order_by(models.Experiment.created_at.desc())
        .all()
    )


@router.get("/projects/{project_id}/experiments/{experiment_id}", response_model=schemas.ExperimentOut)
def get_experiment(project_id: int, experiment_id: int, db: Session = Depends(get_db)):
    exp = db.get(models.Experiment, experiment_id)
    if not exp or exp.project_id != project_id:
        raise HTTPException(404, "Experiment not found")
    return exp


@router.delete("/projects/{project_id}/experiments/{experiment_id}")
def delete_experiment(project_id: int, experiment_id: int, db: Session = Depends(get_db)):
    exp = db.get(models.Experiment, experiment_id)
    if not exp or exp.project_id != project_id:
        raise HTTPException(404, "Experiment not found")
    db.delete(exp)
    db.commit()
    return {"ok": True}
