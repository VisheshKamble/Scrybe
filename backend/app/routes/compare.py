from fastapi import APIRouter

from app.celery_app import celery_app
from app.models.schemas import CompareRequest
from app.tasks.compare_videos import dispatch_comparison

router = APIRouter(prefix="/compare", tags=["compare"])


@router.post("")
def compare(payload: CompareRequest):
    async_result = dispatch_comparison(payload.youtube_urls, payload.focus)
    return {"job_id": async_result.id, "status": "queued"}


@router.get("/{job_id}/status")
def compare_status(job_id: str):
    result = celery_app.AsyncResult(job_id)
    if result.ready():
        return {"status": "done", "result": result.result}
    return {"status": result.state.lower()}
