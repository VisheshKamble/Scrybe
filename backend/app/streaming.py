"""Redis pub/sub bridge between the Celery worker (producer) and the
FastAPI SSE endpoint (consumer). This is what lets a report stream live
to the browser even though it's actually being generated in a background
worker process, not in the request/response cycle.
"""

import redis

from app.config import settings

redis_client = redis.from_url(settings.redis_url)


def publish_token(video_id: str, token: str) -> None:
    redis_client.publish(f"report:{video_id}", token)


def publish_done(video_id: str) -> None:
    redis_client.publish(f"report:{video_id}", "[DONE]")
