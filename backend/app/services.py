"""Submission logic shared by the video and compare routes."""

from __future__ import annotations

from app.errors import ErrorCode, ScrybeError
from app.jobs import JobStatus, JobStore
from app.ratelimit import enforce_submission_limits
from app.report_store import report_exists
from app.validation import canonical_youtube_url, extract_youtube_id, video_id_for_youtube


def submit_video(url: str, client_id: str, *, enforce_limits: bool = True) -> tuple[dict, bool]:
    yid = extract_youtube_id(url)
    if not yid:
        raise ScrybeError(ErrorCode.INVALID_URL, "rejected by validator")
    store = JobStore()
    video_id = video_id_for_youtube(yid)
    canonical = canonical_youtube_url(url)

    existing_id = None
    from app import redis_client

    existing_id = redis_client.get_redis().get(f"video_job:{video_id}")
    existing = store.get(existing_id) if existing_id else None
    if existing and existing["status"] != JobStatus.FAILED.value:
        return existing, False  # idempotent: no quota consumed for a duplicate

    if enforce_limits:
        enforce_submission_limits(client_id, store.active_jobs_for_client(client_id))
    job, created = store.find_or_create_for_video(video_id=video_id, source_url=canonical, client_id=client_id)
    if not created:
        return job, False
    store.track_client_job(client_id, job["job_id"])
    if report_exists(video_id):
        store.mark_completed(job["job_id"])
        return store.get(job["job_id"]), True
    try:
        from app.tasks.ingest import ingest_youtube_task

        ingest_youtube_task.apply_async(args=[job["job_id"]], queue="youtube_ingestion")
    except Exception as exc:
        err = ScrybeError(ErrorCode.INTERNAL_ERROR, f"broker unavailable: {type(exc).__name__}", retryable=True)
        store.mark_failed(job["job_id"], err)  # so a retry creates a fresh job
        raise
    return job, True
