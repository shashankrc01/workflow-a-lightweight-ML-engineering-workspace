FROM python:3.12-slim

WORKDIR /app

# System deps needed by psycopg2 (only relevant if DATABASE_URL points at Postgres)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Persisted at runtime via a mounted volume in docker-compose / your host's disk
RUN mkdir -p storage/datasets storage/models

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
