"""Stage 1: YouTube download -> object storage. Runs on the `youtube_ingestion`
queue, the only code path that talks to YouTube."""

from __future__ import annotations

import logging
import shutil
import time
from pathlib import Path

from celery.exceptions import SoftTimeLimitExceeded

from app.celery_app import celery_app
from app.config import settings
from app.errors import IP_LEVEL_BLOCK_CODES, ErrorCode, ScrybeError, classify_exception
from app.ingestion import gate
from app.ingestion.youtube import download_video
from app.jobs import JobStatus, JobStore
from app.observability import log_event
from app.report_store import report_exists
from app.retry import backoff_with_jitter
from app.storage import get_storage

log = logging.getLogger("scrybe")
MAX_QUEUE_WAIT_SECONDS = 4 * 3600  # give up waiting on the gate after this long


def video_key(video_id: str) -> str:
    return f"videos/{video_id}.mp4"


def caption_key(video_id: str) -> str:
    return f"videos/{video_id}.en.srt"


def _dispatch_processing(job_id: str) -> None:
    from app.tasks.process_video import process_video_task

    process_video_task.apply_async(args=[job_id], queue="video_processing")


@celery_app.task(
    bind=True,
    name="scrybe.ingest_youtube",
    max_retries=None,
    soft_time_limit=settings.ingest_soft_time_limit,
    time_limit=settings.ingest_time_limit,
)
def ingest_youtube_task(self, job_id: str) -> None:
    store = JobStore()
    job = store.get(job_id)
    if not job or job["status"] in (JobStatus.COMPLETED.value, JobStatus.FAILED.value):
        return  # duplicate / stale delivery
    video_id = job["video_id"]
    storage = get_storage()

    # Idempotency: finished already, or an earlier attempt downloaded successfully.
    if report_exists(video_id):
        store.mark_completed(job_id)
        return
    if storage.exists(video_key(video_id)):
        store.update(job_id, status=JobStatus.DOWNLOADED, stage="downloaded", progress=25)
        _dispatch_processing(job_id)
        return

    if time.time() - float(job["created_at"]) > MAX_QUEUE_WAIT_SECONDS:
        store.mark_failed(job_id, ScrybeError(ErrorCode.YOUTUBE_RATE_LIMITED, "gave up waiting for YouTube capacity", retryable=True))
        return

    decision = gate.try_acquire()
    if not decision.acquired:  # polite wait; does NOT count against the retry budget
        is_cooldown = decision.reason == "cooldown"
        store.update(
            job_id,
            status=JobStatus.RATE_LIMITED if is_cooldown else JobStatus.QUEUED,
            stage="waiting for YouTube capacity" if not is_cooldown else "YouTube cooldown",
            error_code=ErrorCode.YOUTUBE_RATE_LIMITED.value if is_cooldown else None,
            error_message=None,
            retryable=True,
        )
        raise self.retry(countdown=max(decision.wait_seconds, 5))

    work = Path(settings.work_dir) / f"ingest_{job_id}"
    try:
        store.update(job_id, status=JobStatus.DOWNLOADING, stage="downloading video", progress=10, error_code=None, error_message=None)
        t0 = time.perf_counter()
        dl = download_video(job["source_url"], video_id, work)
        storage.upload_file(video_key(video_id), dl["video_path"])
        if dl["caption_path"]:
            storage.upload_file(caption_key(video_id), dl["caption_path"])
        log_event("ingest_done", job_id=job_id, video_id=video_id, stage="download", latency_ms=round((time.perf_counter() - t0) * 1000))
        store.update(job_id, status=JobStatus.DOWNLOADED, stage="downloaded", progress=25)
    except SoftTimeLimitExceeded:
        err = ScrybeError(ErrorCode.YOUTUBE_NETWORK_ERROR, "ingest soft time limit")
        _handle_failure(self, store, job_id, err)
    except Exception as exc:  # noqa: BLE001 - classified below, never leaked raw
        err = classify_exception(exc)
        _handle_failure(self, store, job_id, err)
    else:
        _dispatch_processing(job_id)
    finally:
        gate.release(decision.token)
        shutil.rmtree(work, ignore_errors=True)  # guaranteed temp cleanup, success or failure


def _handle_failure(task, store: JobStore, job_id: str, err: ScrybeError) -> None:
    log_event("ingest_failed", job_id=job_id, error_code=err.code.value)
    if err.code in IP_LEVEL_BLOCK_CODES:
        gate.trip_cooldown()  # every worker backs off, not just this job
    retries = store.get(job_id)["retry_count"]
    if err.retryable and retries < settings.youtube_max_retries:
        n = store.incr_retry(job_id)
        delay = backoff_with_jitter(n - 1, settings.youtube_retry_base_seconds, settings.youtube_retry_max_seconds)
        if err.code in IP_LEVEL_BLOCK_CODES:
            delay = max(delay, gate.cooldown_remaining())
        store.update(
            job_id,
            status=JobStatus.RATE_LIMITED if err.code in IP_LEVEL_BLOCK_CODES else JobStatus.RETRYING,
            stage=f"retrying (attempt {n}/{settings.youtube_max_retries})",
            error_code=err.code.value,
            error_message=err.user_message,
            retryable=True,
        )
        raise task.retry(countdown=delay)
    store.mark_failed(job_id, err)  # permanent, or retry budget exhausted -> stop, don't loop
