import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()  # reads a local .env file if present; no-op otherwise

# Base directory of the backend app
BASE_DIR = Path(__file__).resolve().parent.parent

# Storage locations (local disk - keeps this a single-machine, dependency-free setup)
STORAGE_DIR = BASE_DIR / "storage"
DATASETS_DIR = STORAGE_DIR / "datasets"
MODELS_DIR = STORAGE_DIR / "models"

DATASETS_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Database URL.
# Defaults to a local SQLite file so the project runs with zero external
# services. Swap this for a PostgreSQL URL later, e.g.:
#   postgresql+psycopg2://user:password@localhost:5432/ml_workspace
# The rest of the codebase (SQLAlchemy models, queries) does not need to
# change - that's the point of using SQLAlchemy as the abstraction layer.
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'ml_workspace.db'}")

# High cardinality threshold used by the dataset health checker
HIGH_CARDINALITY_THRESHOLD = 50
# Class imbalance is flagged when the minority class share drops below this
CLASS_IMBALANCE_THRESHOLD = 0.1

# Comma-separated list of allowed frontend origins for CORS, e.g.
#   CORS_ORIGINS=https://forgeml.vercel.app,http://localhost:5173
# Defaults to "*" for local development only - always set this explicitly
# in production.
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
