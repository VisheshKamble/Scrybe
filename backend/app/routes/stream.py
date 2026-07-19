from fastapi import APIRouter
from redis import asyncio as aioredis
from sse_starlette.sse import EventSourceResponse

from app.config import settings

router = APIRouter(prefix="/stream", tags=["stream"])


@router.get("/{video_id}")
async def stream_report(video_id: str):
    async def event_generator():
        client = aioredis.from_url(settings.redis_url)
        pubsub = client.pubsub()
        await pubsub.subscribe(f"report:{video_id}")
        try:
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                data = message["data"].decode("utf-8")
                if data == "[DONE]":
                    yield {"event": "done", "data": ""}
                    break
                yield {"event": "token", "data": data}
        finally:
            await pubsub.unsubscribe(f"report:{video_id}")
            await client.close()

    return EventSourceResponse(event_generator())
