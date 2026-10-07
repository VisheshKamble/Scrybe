import json

from fastapi import APIRouter, Depends, Request

from app.errors import ErrorCode, ScrybeError
from app.jobs import JobStatus, JobStore
from app.models.schemas import CompareRequest
from app.ratelimit import client_id, enforce_api_rate_limit
from app.services import submit_video
from app.storage import get_storage
from app.tasks.compare_videos import compare_key, compare_task
from app.validation import is_valid_job_id, is_valid_youtube_url

router = APIRouter(prefix="/compare", tags=["compare"], dependencies=[Depends(enforce_api_rate_limit)])


@router.post("")
def compare(payload: CompareRequest, request: Request):
    if len(payload.youtube_urls) < 2:
        raise ScrybeError(ErrorCode.INVALID_URL, "need at least two URLs")
    if not all(is_valid_youtube_url(u) for u in payload.youtube_urls):
        raise ScrybeError(ErrorCode.INVALID_URL, "bad url in compare list")
    cid = client_id(request)
    jobs = [submit_video(u, cid)[0] for u in payload.youtube_urls]
    store = JobStore()
    cmp_job = store.create(
        kind="compare",
        source_url="",
        video_id=None,
        client_id=cid,
        extra={"video_job_ids": ",".join(j["job_id"] for j in jobs), "focus": payload.focus or ""},
    )
    compare_task.apply_async(args=[cmp_job["job_id"]], queue="ai_tasks")
    return {"job_id": cmp_job["job_id"], "status": "queued"}


@router.get("/{job_id}/status")
def compare_status(job_id: str):
    job = JobStore().get(job_id) if is_valid_job_id(job_id) else None
    if not job:
        raise ScrybeError(ErrorCode.JOB_NOT_FOUND)
    base = {"job_id": job_id, "status": job["status"], "stage": job.get("stage"), "progress": job.get("progress", 0)}
    if job["status"] == JobStatus.COMPLETED.value:
        base["result"] = json.loads(get_storage().download(compare_key(job_id)))
    if job["status"] == JobStatus.FAILED.value:
        base.update(error_code=job["error_code"], error=job["error_message"])
    return base
