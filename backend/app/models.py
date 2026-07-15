import datetime as dt

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text
)
from sqlalchemy.orm import relationship

from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    # Points at the Experiment currently promoted to "production" for this project
    active_experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=True)

    datasets = relationship(
        "Dataset", back_populates="project",
        cascade="all, delete-orphan", foreign_keys="Dataset.project_id"
    )
    experiments = relationship(
        "Experiment", back_populates="project",
        cascade="all, delete-orphan", foreign_keys="Experiment.project_id"
    )
    deployments = relationship(
        "Deployment", back_populates="project",
        cascade="all, delete-orphan", foreign_keys="Deployment.project_id"
    )


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    version = Column(Integer, default=1)
    uploaded_at = Column(DateTime, default=dt.datetime.utcnow)

    # Full Dataset Health Report, stored as JSON so the frontend can render it directly
    health_report = Column(JSON, default=dict)

    project = relationship("Project", back_populates="datasets", foreign_keys=[project_id])
    experiments = relationship("Experiment", back_populates="dataset")


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)

    algorithm = Column(String, nullable=False)
    problem_type = Column(String, nullable=False)  # "classification" | "regression"
    hyperparameters = Column(JSON, default=dict)
    preprocessing_config = Column(JSON, default=dict)

    metrics = Column(JSON, default=dict)
    confusion_matrix = Column(JSON, nullable=True)
    feature_importance = Column(JSON, nullable=True)

    training_duration_seconds = Column(Float, default=0.0)
    model_path = Column(String, nullable=True)  # joblib pipeline (preprocessing + model)

    notes = Column(Text, default="")
    status = Column(String, default="completed")  # queued | running | completed | failed
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=dt.datetime.utcnow)

    project = relationship("Project", back_populates="experiments", foreign_keys=[project_id])
    dataset = relationship("Dataset", back_populates="experiments")


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)

    status = Column(String, default="active")  # active | rolled_back
    deployed_at = Column(DateTime, default=dt.datetime.utcnow)
    notes = Column(Text, default="")

    project = relationship("Project", back_populates="deployments", foreign_keys=[project_id])
    experiment = relationship("Experiment")
