"""Stage 2: transcript / visual / segmentation / synthesis -> index + report.
Reads the source video from object storage; all scratch files live in a
per-job temp dir that is removed in `finally`."""

from __future__ import annotations

import shutil
import time
from pathlib import Path

from celery.exceptions import SoftTimeLimitExceeded

from app import redis_client
from app.agents.graph import video_graph
from app.celery_app import celery_app
from app.config import settings
from app.errors import ErrorCode, ScrybeError, classify_exception
from app.ingestion.audio import extract_audio
from app.ingestion.keyframes import extract_keyframes
from app.jobs import JobStatus, JobStore
from app.observability import log_event
from app.report_store import report_exists, save_report
from app.retry import backoff_with_jitter
from app.storage import get_storage
from app.tasks.ingest import caption_key, video_key
from app.vectorstore.chunking import build_chunks
from app.vectorstore.index import VideoIndex

_PROGRESS = {
    "transcript_agent": (55, "transcribed"),
    "visual_agent": (68, "described key frames"),
    "segmentation_agent": (78, "detected chapters"),
    "synthesis_agent": (88, "wrote summary & checked claims"),
}
MAX_PROCESS_RETRIES = 2


def _classify_provider(exc: Exception) -> ScrybeError:
    try:
        import groq
    except ImportError:  # pragma: no cover
        return classify_exception(exc)
    if isinstance(exc, ScrybeError):
        return exc
    if isinstance(exc, groq.RateLimitError):
        return ScrybeError(ErrorCode.AI_RATE_LIMITED, str(exc))
    if isinstance(exc, groq.APITimeoutError):
        return ScrybeError(ErrorCode.AI_TIMEOUT, str(exc))
    if isinstance(exc, groq.APIError):
        return ScrybeError(ErrorCode.AI_PROVIDER_ERROR, f"{type(exc).__name__}: {exc}")
    return classify_exception(exc)


@celery_app.task(
    bind=True,
    name="scrybe.process_video",
    max_retries=None,
    soft_time_limit=settings.process_soft_time_limit,
    time_limit=settings.process_time_limit,
)
def process_video_task(self, job_id: str) -> dict | None:
    store = JobStore()
    job = store.get(job_id)
    if not job or job["status"] in (JobStatus.COMPLETED.value, JobStatus.FAILED.value):
        return None
    video_id = job["video_id"]
    if report_exists(video_id):
        store.mark_completed(job_id)
        return None

    # Duplicate-execution guard (redelivery after worker loss, double dispatch).
    lock_key = f"lock:process:{video_id}"
    r = redis_client.get_redis()
    if not r.set(lock_key, job_id, nx=True, ex=settings.process_time_limit + 60):
        raise self.retry(countdown=30)

    storage = get_storage()
    work = Path(settings.work_dir) / f"proc_{job_id}"
    try:
        work.mkdir(parents=True, exist_ok=True)
        store.update(job_id, status=JobStatus.PROCESSING, stage="loading video", progress=28, error_code=None, error_message=None)
        local_video = str(work / f"{video_id}.mp4")
        storage.download_file(video_key(video_id), local_video)
        caption_path = None
        if storage.exists(caption_key(video_id)):
            caption_path = str(work / f"{video_id}.en.srt")
            storage.download_file(caption_key(video_id), caption_path)

        store.update(job_id, stage="extracting key frames", progress=35)
        keyframes = extract_keyframes(local_video, video_id, max_frames=settings.max_keyframes_per_video, out_root=work / "frames")
        audio_path = None if caption_path else extract_audio(local_video, video_id, out_dir=work / "audio")
        Path(local_video).unlink(missing_ok=True)  # biggest file; no longer needed

        state = {
            "video_id": video_id,
            "video_path": local_video,
            "audio_path": audio_path,
            "caption_path": caption_path,
            "keyframes": keyframes,
        }
        store.update(job_id, stage="transcribing", progress=42)
        t0 = time.perf_counter()
        for update in video_graph.stream(state, stream_mode="updates"):
            ((node, node_state),) = update.items()
            state = node_state or state
            if node in _PROGRESS:
                pct, label = _PROGRESS[node]
                store.update(job_id, stage=label, progress=pct)
        log_event("pipeline_done", job_id=job_id, video_id=video_id, stage="graph", latency_ms=round((time.perf_counter() - t0) * 1000))

        store.update(job_id, status=JobStatus.INDEXING, stage="building search index", progress=92)
        chunks = build_chunks(video_id, state["transcript_segments"], state.get("visual_descriptions"), state.get("chapters"))
        t1 = time.perf_counter()
        VideoIndex(video_id).build(chunks)
        log_event(
            "index_built",
            job_id=job_id,
            video_id=video_id,
            stage="index",
            n_results=len(chunks),
            latency_ms=round((time.perf_counter() - t1) * 1000),
        )

        save_report(
            video_id,
            {
                "video_id": video_id,
                "summary": state["summary"],
                "chapters": state["chapters"],
                "claims": state["claims"],
                "pipeline_errors": state.get("errors", []),
            },
        )
        if not settings.retain_source_video:
            storage.delete(video_key(video_id))
            storage.delete(caption_key(video_id))
        store.mark_completed(job_id)
        return {"video_id": video_id}
    except SoftTimeLimitExceeded:
        store.mark_failed(job_id, ScrybeError(ErrorCode.INTERNAL_ERROR, "processing time limit exceeded", retryable=False))
    except Exception as exc:  # noqa: BLE001
        err = _classify_provider(exc)
        log_event("process_failed", job_id=job_id, error_code=err.code.value)
        n = store.get(job_id)["retry_count"]
        if err.retryable and n < MAX_PROCESS_RETRIES:
            store.incr_retry(job_id)
            store.update(
                job_id,
                status=JobStatus.RETRYING,
                stage="retrying",
                error_code=err.code.value,
                error_message=err.user_message,
                retryable=True,
            )
            raise self.retry(countdown=backoff_with_jitter(n, 20, 300)) from exc
        store.mark_failed(job_id, err)
    finally:
        r.delete(lock_key)
        shutil.rmtree(work, ignore_errors=True)
    return None
