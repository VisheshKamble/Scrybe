#!/bin/sh
# Dedicated worker. Pick workloads with CELERY_QUEUES, e.g.
#   CELERY_QUEUES=youtube_ingestion CELERY_CONCURRENCY=1   (YouTube egress)
#   CELERY_QUEUES=video_processing,ai_tasks CELERY_CONCURRENCY=2
exec celery -A app.celery_app worker --loglevel=info \
  --concurrency="${CELERY_CONCURRENCY:-2}" \
  -Q "${CELERY_QUEUES:-youtube_ingestion,video_processing,embeddings,ai_tasks,reports}"
