from celery import Celery

from app.config import settings

celery_app = Celery(
    "scrybe",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.process_video", "app.tasks.compare_videos"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_track_started=True,
    result_expires=settings.celery_result_expires_seconds,
)
