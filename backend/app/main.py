from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.config import CORS_ORIGINS
from app.routers import projects, datasets, experiments, deployments, inference

# Creates tables on startup if they don't exist yet.
# (For a real production system you'd use Alembic migrations instead -
# this project intentionally keeps that out to stay lightweight, but the
# SQLAlchemy models are already structured so Alembic can be dropped in later.)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Lightweight ML Engineering Workspace",
    description="A minimal, self-hostable platform to manage the ML experimentation "
                 "lifecycle: dataset health checks, training, experiment tracking, "
                 "and model deployment/inference.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if CORS_ORIGINS == "*" else [o.strip() for o in CORS_ORIGINS.split(",")],
    allow_credentials=CORS_ORIGINS != "*",  # credentials + wildcard origin is disallowed by browsers anyway
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(datasets.router)
app.include_router(experiments.router)
app.include_router(deployments.router)
app.include_router(inference.router)


@app.get("/")
def root():
    return {
        "message": "Lightweight ML Engineering Workspace API",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
