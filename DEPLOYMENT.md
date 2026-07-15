# Deployment Guide

This project can run three ways. Start with the first — it's the fastest way
to get something real to show, and it's what most interviewers actually mean
when they ask "did you deploy it?"

1. **Docker Compose, locally** — proves you can containerize a multi-service
   app. Takes 5 minutes, needs nothing but Docker.
2. **Free-tier cloud (Render + a live URL)** — an actual public link you can
   put on your resume/LinkedIn.
3. **Manual venv/npm run** — what you've been doing so far; fine for
   day-to-day development, not what you'd call "deployed."

---

## 1. Docker Compose (local, containerized)

This spins up Postgres, the FastAPI backend, and the React frontend (built
and served by nginx) as three containers that talk to each other — closer to
how this would actually run in production than `uvicorn --reload`.

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend docs: http://localhost:8000/docs
- Postgres: localhost:5432 (user/pass/db all `forgeml`)

What's happening under the hood (worth understanding, not just running):
- `backend/Dockerfile` installs the Python deps and runs uvicorn.
- `frontend/Dockerfile` is a **multi-stage build**: stage 1 runs `npm run
  build` to produce static files, stage 2 copies just those static files
  into a tiny nginx image. The `nginx.conf` rewrites all routes to
  `index.html` so React Router's client-side routes (e.g.
  `/projects/3/experiments`) don't 404 on a hard refresh.
- `docker-compose.yml` wires them together and swaps `DATABASE_URL` to
  point at the Postgres container instead of the SQLite file default.
- `backend_storage` and `db_data` are named volumes, so uploaded datasets,
  trained models, and the database survive `docker compose down` (but not
  `docker compose down -v`).

To stop: `docker compose down`. To reset everything (fresh DB, no old
models): `docker compose down -v`.

---

## 2. Cloud deployment (Render — free, no credit card, public URL)

This is the one to actually put in your resume/portfolio: a real link
someone can click. It's genuinely free — no credit card required for the
free tier. But it has real limitations worth understanding *before* you
deploy, not discovering after:

- **Cold starts.** Free web services spin down after 15 minutes of no
  traffic and take ~30-60 seconds to wake back up on the next request.
  Someone opening your link after it's been idle will see a slow first
  load — that's expected, not broken.
- **Ephemeral disk.** This is the important one. Free web services have no
  persistent filesystem — any file written to disk (an uploaded CSV, a
  trained `.joblib` model) is **wiped every time the service spins down and
  restarts**. Database rows survive (they're in Postgres), but the actual
  files they point to can disappear. Persistent disks are a paid-instance
  feature.
- **Render's own free Postgres expires 30 days after creation** (14-day
  grace period, then it's deleted). Bad fit for a link you want to keep
  working. Use **[Neon](https://neon.tech)** instead — free Postgres tier,
  no expiration, no credit card, made for exactly this use case.

**What this means practically:** the live demo is genuinely great for
walking someone through the workflow *while you're both looking at it live*
— upload a dataset, train a model, deploy it, right there in the call. It's
not reliable as an "always has my old data sitting there" showcase, because
the free tier's disk isn't built for that. That's a real, explainable
architecture tradeoff — see "What to say if asked about this" below.

### Setup

1. **Create a free Neon database.** Go to [neon.tech](https://neon.tech),
   sign up (no card), create a project, and copy the connection string it
   gives you (starts with `postgresql://`). Change it to
   `postgresql+psycopg2://...` (SQLAlchemy needs the `+psycopg2` driver
   suffix) — that's your `DATABASE_URL`.
2. Push this project to a GitHub repo.
3. Go to [render.com](https://render.com) → **New → Blueprint** → point it
   at your repo. Render reads `render.yaml` and creates two services:
   `forgeml-backend` (Docker web service) and `forgeml-frontend` (static
   site). Both env vars are left blank on purpose (`sync: false`) so you
   fill them in next.
4. On `forgeml-backend`, set environment variables:
   - `DATABASE_URL` → your Neon connection string from step 1
   - `CORS_ORIGINS` → your frontend's URL, e.g. `https://forgeml-frontend.onrender.com`
5. On `forgeml-frontend`, set:
   - `VITE_API_BASE` → your backend's URL, e.g. `https://forgeml-backend.onrender.com`
   - trigger a manual redeploy after setting it (Vite bakes env vars in at
     build time, so it needs a rebuild to pick up the change)
6. Your frontend URL is the link for your resume.

### Before you actually demo it to someone

Open the link yourself a minute or two beforehand (wakes the backend from
cold start), and upload a dataset + train a model fresh if it's been a
while since the files were last touched. Takes under a minute and avoids
walking into a stale/broken-looking demo mid-interview.

### What to say if asked about this

If an interviewer clicks the link and something looks off because the free
tier wiped a file, that's not a script to hide — it's a better answer than
a flawless demo:

> "The free hosting tier I used doesn't persist local disk across
> restarts, so uploaded files can disappear after the service goes idle —
> database records survive, but the artifacts they reference don't. In a
> real deployment I'd fix that by moving file storage to S3 or a similar
> object store, which the codebase is already set up for — `model_registry.py`
> only exposes a `save`/`load` interface, so swapping the backend is a
> contained change, not a rewrite."

That's a stronger interview answer than "it just works," because it shows
you understand *why* it behaves the way it does and what you'd change.

### Alternative frontend host: Vercel or Netlify

If you'd rather host the frontend separately from Render (both are solid,
free, and arguably more common for pure static/React sites on a resume):

```bash
cd frontend
npm install -g vercel   # or use the Vercel/Netlify web dashboard instead
vercel
```

Either way, set one environment variable in the dashboard:
`VITE_API_BASE=https://your-backend-url`, then redeploy. The build command
is `npm run build`, output directory is `dist`.

---

## 3. Manual (development only)

```bash
# backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# frontend
cd frontend && npm install && npm run dev
```

This is what you've already been running. It's the right setup for active
development, but "runs on my machine with `--reload`" isn't a deployment —
options 1 and 2 above are what demonstrate that skill.

---

## Environment variables reference

| Variable | Where | Purpose | Default |
|---|---|---|---|
| `DATABASE_URL` | backend | SQLAlchemy connection string | local SQLite file |
| `CORS_ORIGINS` | backend | comma-separated allowed frontend origins | `*` (dev only) |
| `VITE_API_BASE` | frontend (build-time) | backend URL the SPA calls | `http://localhost:8000` |

`VITE_API_BASE` is baked in at **build time** (Vite inlines env vars into
the static JS bundle), not read at runtime — so changing it always requires
a rebuild/redeploy of the frontend, not just an env var tweak.

---

## What to actually say on your resume

Something like:

> Built and deployed ForgeML, a full-stack ML experimentation platform
> (FastAPI + PostgreSQL + React) with automated dataset health checks,
> experiment tracking, model versioning, and a REST inference endpoint for
> deployed models. Containerized with Docker and deployed to Render with a
> managed Postgres instance and a CI-buildable static frontend.

That's an honest, specific sentence an interviewer can ask follow-up
questions about — and now you can actually answer them, including the
tradeoffs (SQLite→Postgres, free-tier cold starts, why CORS is
origin-restricted in prod but wide open in dev).
