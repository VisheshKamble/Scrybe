from fastapi import APIRouter, HTTPException

from app.celery_app import celery_app
from app.models.schemas import CompareRequest
from app.tasks.compare_videos import dispatch_comparison
from app.validation import is_valid_youtube_url

router = APIRouter(prefix="/compare", tags=["compare"])


@router.post("")
def compare(payload: CompareRequest):
    # Same reasoning as videos.py:submit_video -- the frontend already
    # enforces "at least two, all valid YouTube URLs" (see Compare.jsx),
    # but that's bypassable by anyone calling the API directly. Checking
    # again here rejects a bad request immediately instead of dispatching
    # a chord of Celery tasks that's only discovered to be broken later.
    if len(payload.youtube_urls) < 2:
        raise HTTPException(400, "Add at least two YouTube URLs to compare.")
    invalid = next((u for u in payload.youtube_urls if not is_valid_youtube_url(u)), None)
    if invalid:
        raise HTTPException(400, f"'{invalid}' doesn't look like a YouTube video URL.")
    async_result = dispatch_comparison(payload.youtube_urls, payload.focus)
    return {"job_id": async_result.id, "status": "queued"}


@router.get("/{job_id}/status")
def compare_status(job_id: str):
    result = celery_app.AsyncResult(job_id)
    if result.state == "SUCCESS":
        return {"status": "done", "result": result.result}
    if result.state == "FAILURE":
        return {"status": "failed", "error": str(result.result)}
    return {"status": result.state.lower()}
