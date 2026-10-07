# Local development

## With Docker (recommended)
```bash
cp backend/.env.example backend/.env     # set GROQ_API_KEY
docker compose up --build
```
Services: `backend` (:8000), `worker-youtube` (queue `youtube_ingestion`, concurrency 1), `worker-processing` (other queues, scalable with `--scale worker-processing=N`), `redis`, `bgutil` (PO Token provider, :4416), `frontend` (:5173). Data lives in the `scrybe-data` volume.

## Without Docker
Requirements: Python 3.11+, FFmpeg, Deno, Redis.
```bash
cd backend && python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
export GROQ_API_KEY=... REDIS_URL=redis://localhost:6379/0
uvicorn app.main:app --reload
celery -A app.celery_app worker -l info -Q youtube_ingestion,video_processing,embeddings,ai_tasks,reports   # second terminal
cd ../frontend && npm ci && npm run dev    # VITE_API_URL=http://localhost:8000/api
```

## Tests and checks
```bash
cd backend
ruff check . && ruff format --check .
python -m pytest -q                     # no network, no YouTube, no real LLM
PYTHONPATH=. python scripts/evaluate_rag.py   # offline retrieval/routing eval
```
Tests use fakeredis, a fake LLM, a hash embedder and mocked yt-dlp/ffmpeg boundaries. `EMBEDDING_PROVIDER=hash` avoids downloading a model.

## Handy
- `GET /health` liveness, `GET /ready` Redis + storage readiness, `/docs` OpenAPI.
- Job states: `GET /api/videos/{job_id}`.
- Logs are JSON lines (`event`, `request_id`, `latency_ms`, ...).
