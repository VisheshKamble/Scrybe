#!/bin/sh
set -e

celery -A app.celery_app worker --loglevel=info --pool=solo --concurrency=1 &
worker_pid=$!

trap 'kill "$worker_pid" 2>/dev/null || true' TERM INT
uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"