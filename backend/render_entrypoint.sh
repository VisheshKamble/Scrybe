#!/bin/sh
set -e

celery -A app.celery_app worker --loglevel=info --concurrency=2 &
worker_pid=$!

trap 'kill "$worker_pid" 2>/dev/null || true' TERM INT
uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"