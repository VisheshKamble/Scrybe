#!/bin/sh
# Single-service mode (Render free tier / small deployments): API + one worker
# consuming every queue. For real scale, run workers as separate services with
# dedicated -Q lists (see docs/deployment.md).
set -e

celery -A app.celery_app worker --loglevel=info --pool=solo --concurrency=1 \
  -Q "${CELERY_QUEUES:-youtube_ingestion,video_processing,embeddings,ai_tasks,reports}" &
worker_pid=$!

trap 'kill "$worker_pid" 2>/dev/null || true' TERM INT
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
