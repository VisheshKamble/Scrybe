from celery import Celery
from kombu import Exchange, Queue

from app.config import settings

QUEUES = ("youtube_ingestion", "video_processing", "embeddings", "ai_tasks", "reports")

celery_app = Celery(
    "scrybe",
    broker=settings.redis_url,  # unchanged: rediss:// (Upstash TLS) keeps working
    backend=settings.redis_url,
    include=["app.tasks.ingest", "app.tasks.process_video", "app.tasks.compare_videos"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_track_started=True,
    result_expires=settings.celery_result_expires_seconds,
    # --- queues: scale each workload independently by choosing `-Q` per worker
    task_default_queue="video_processing",
    # One shared direct exchange, one routing key per queue. (A bare Queue(name)
    # inherits the default queue's routing key, which binds every queue to the
    # same key and delivers each message to ALL of them.)
    task_queues=[Queue(q, Exchange("scrybe", type="direct"), routing_key=q) for q in QUEUES],
    task_default_exchange="scrybe",
    task_default_routing_key="video_processing",
    task_routes={
        "scrybe.ingest_youtube": {"queue": "youtube_ingestion"},
        "scrybe.process_video": {"queue": "video_processing"},
        "scrybe.compare_videos": {"queue": "ai_tasks"},
    },
    # --- reliability
    broker_connection_retry_on_startup=True,  # worker waits for Redis instead of crashing at boot
    task_acks_late=True,  # un-acked tasks are redelivered if the worker dies...
    task_reject_on_worker_lost=True,  # ...which is why every task is idempotent (see tasks/*)
    worker_prefetch_multiplier=1,  # long tasks: don't hoard messages behind a 20-min job
    broker_transport_options={"visibility_timeout": settings.broker_visibility_timeout},  # must exceed time limits
)
