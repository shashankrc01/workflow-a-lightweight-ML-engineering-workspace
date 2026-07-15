from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/projects/{project_id}/deployments", tags=["deployments"])


@router.post("", response_model=schemas.DeploymentOut)
def promote_experiment(project_id: int, payload: schemas.DeployRequest, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    experiment = db.get(models.Experiment, payload.experiment_id)
    if not experiment or experiment.project_id != project_id:
        raise HTTPException(404, "Experiment not found in this project")
    if experiment.status != "completed" or not experiment.model_path:
        raise HTTPException(400, "Only successfully completed experiments can be deployed")

    # mark any currently active deployment as rolled_back
    db.query(models.Deployment).filter_by(project_id=project_id, status="active").update(
        {"status": "rolled_back"}
    )

    deployment = models.Deployment(
        project_id=project_id,
        experiment_id=experiment.id,
        status="active",
        notes=payload.notes,
    )
    db.add(deployment)

    project.active_experiment_id = experiment.id
    db.add(project)

    db.commit()
    db.refresh(deployment)
    return deployment


@router.get("", response_model=list[schemas.DeploymentOut])
def deployment_history(project_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Deployment)
        .filter_by(project_id=project_id)
        .order_by(models.Deployment.deployed_at.desc())
        .all()
    )


@router.post("/rollback/{deployment_id}", response_model=schemas.DeploymentOut)
def rollback(project_id: int, deployment_id: int, db: Session = Depends(get_db)):
    """Roll back to a previous deployment record (re-activates its experiment)."""
    target = db.get(models.Deployment, deployment_id)
    if not target or target.project_id != project_id:
        raise HTTPException(404, "Deployment not found")

    db.query(models.Deployment).filter_by(project_id=project_id, status="active").update(
        {"status": "rolled_back"}
    )

    new_record = models.Deployment(
        project_id=project_id,
        experiment_id=target.experiment_id,
        status="active",
        notes=f"Rollback to deployment #{target.id}",
    )
    db.add(new_record)

    project = db.get(models.Project, project_id)
    project.active_experiment_id = target.experiment_id
    db.add(project)

    db.commit()
    db.refresh(new_record)
    return new_record
