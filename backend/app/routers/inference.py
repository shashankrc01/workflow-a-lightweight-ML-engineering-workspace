import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.services.model_registry import load_model

router = APIRouter(prefix="/projects/{project_id}/predict", tags=["inference"])


@router.post("", response_model=schemas.InferenceResponse)
def predict(project_id: int, payload: schemas.InferenceRequest, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if not project.active_experiment_id:
        raise HTTPException(400, "This project has no active deployed model yet")

    experiment = db.get(models.Experiment, project.active_experiment_id)
    if not experiment or not experiment.model_path:
        raise HTTPException(500, "Deployed experiment has no model artifact")

    if not payload.records:
        raise HTTPException(400, "No input records provided")

    try:
        pipeline = load_model(experiment.model_path)
        input_df = pd.DataFrame(payload.records)
        preds = pipeline.predict(input_df)
    except Exception as e:
        raise HTTPException(400, f"Inference failed: {e}")

    return schemas.InferenceResponse(
        predictions=preds.tolist(),
        experiment_id=experiment.id,
        model_algorithm=experiment.algorithm,
    )
