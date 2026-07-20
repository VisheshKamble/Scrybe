import json
from pathlib import Path

from fastapi import APIRouter
from redis import asyncio as aioredis
from sse_starlette.sse import EventSourceResponse

from app.config import settings

router = APIRouter(prefix="/stream", tags=["stream"])
REPORT_DIR = Path("data/reports")


@router.get("/{video_id}")
async def stream_report(video_id: str):
    """Relays the summary live while a video is still processing.

    Redis pub/sub has no memory -- a subscriber that connects after the
    tokens were published gets nothing, ever, not even the "done" signal.
    In practice that's the common case here: the frontend only learns a
    video is finished (and only then opens this connection) by polling
    `/videos/{job_id}/status`, which doesn't flip to "done" until *after*
    the whole pipeline -- including summary generation -- has already run
    to completion and published every token to a channel nobody was
    listening on yet. Without this check, that client hangs on an empty
    summary forever, and everything downstream of it in the UI that
    waits on "done" never loads either.

    So: if the report is already on disk, this video is fully processed
    and there's nothing left to stream live -- replay the finished
    summary as a single event instead of subscribing to a channel that
    will never receive anything. A client that connects *while* the video
    is still processing (report not on disk yet) still gets the real
    live token-by-token stream below.
    """
    report_path = REPORT_DIR / f"{video_id}.json"

    async def event_generator():
        if report_path.exists():
            report = json.loads(report_path.read_text())
            yield {"event": "token", "data": report.get("summary", "")}
            yield {"event": "done", "data": ""}
            return

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
