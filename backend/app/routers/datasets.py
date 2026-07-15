import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import DATASETS_DIR
from app import models, schemas
from app.services.dataset_analysis import analyze_dataset

router = APIRouter(prefix="/projects/{project_id}/datasets", tags=["datasets"])


@router.post("", response_model=schemas.DatasetOut)
def upload_dataset(
    project_id: int,
    file: UploadFile = File(...),
    target_column: str | None = None,
    db: Session = Depends(get_db),
):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported")

    project_dir = Path(DATASETS_DIR) / f"project_{project_id}"
    project_dir.mkdir(parents=True, exist_ok=True)

    existing_count = db.query(models.Dataset).filter_by(project_id=project_id).count()
    version = existing_count + 1
    dest_path = project_dir / f"v{version}_{file.filename}"

    with dest_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        report = analyze_dataset(str(dest_path), target_column=target_column)
    except Exception as e:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(400, f"Failed to analyze dataset: {e}")

    dataset = models.Dataset(
        project_id=project_id,
        filename=file.filename,
        filepath=str(dest_path),
        version=version,
        health_report=report,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


@router.get("", response_model=list[schemas.DatasetOut])
def list_datasets(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.Dataset).filter_by(project_id=project_id).order_by(models.Dataset.version.desc()).all()


@router.get("/{dataset_id}", response_model=schemas.DatasetOut)
def get_dataset(project_id: int, dataset_id: int, db: Session = Depends(get_db)):
    ds = db.get(models.Dataset, dataset_id)
    if not ds or ds.project_id != project_id:
        raise HTTPException(404, "Dataset not found")
    return ds


@router.patch("/{dataset_id}", response_model=schemas.DatasetOut)
def rename_dataset(project_id: int, dataset_id: int, payload: schemas.DatasetRename, db: Session = Depends(get_db)):
    ds = db.get(models.Dataset, dataset_id)
    if not ds or ds.project_id != project_id:
        raise HTTPException(404, "Dataset not found")
    if not payload.filename.strip():
        raise HTTPException(400, "Name cannot be empty")
    ds.filename = payload.filename.strip()
    db.commit()
    db.refresh(ds)
    return ds


@router.delete("/{dataset_id}")
def delete_dataset(project_id: int, dataset_id: int, db: Session = Depends(get_db)):
    ds = db.get(models.Dataset, dataset_id)
    if not ds or ds.project_id != project_id:
        raise HTTPException(404, "Dataset not found")

    linked = db.query(models.Experiment).filter_by(dataset_id=dataset_id).count()
    if linked:
        raise HTTPException(
            400,
            f"Can't delete this dataset — {linked} experiment(s) were trained on it. "
            f"Delete those experiments first."
        )

    Path(ds.filepath).unlink(missing_ok=True)
    db.delete(ds)
    db.commit()
    return {"ok": True}
