"""Redis-backed job records.

A *job* is the user-visible unit ("process this video"). It is separate from
Celery task ids on purpose: tasks may be retried, redelivered or re-queued,
while the job id the frontend polls stays stable.
"""

from __future__ import annotations

import time
import uuid
from enum import Enum

from app import redis_client
from app.config import settings
from app.errors import ErrorCode, ScrybeError


class JobStatus(str, Enum):
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    DOWNLOADED = "downloaded"
    PROCESSING = "processing"
    INDEXING = "indexing"
    COMPLETED = "completed"
    RETRYING = "retrying"
    RATE_LIMITED = "rate_limited"
    FAILED = "failed"


TERMINAL = {JobStatus.COMPLETED, JobStatus.FAILED}
_INT_FIELDS = {"progress", "retry_count"}
_NULLABLE = ("error_code", "error_message", "completed_at", "next_retry_at", "result_key")


def _jkey(job_id: str) -> str:
    return f"job:{job_id}"


class JobStore:
    def _r(self):
        return redis_client.get_redis()

    def get(self, job_id: str) -> dict | None:
        raw = self._r().hgetall(_jkey(job_id))
        if not raw:
            return None
        job = dict(raw)
        for f in _INT_FIELDS:
            job[f] = int(job.get(f, 0) or 0)
        for f in _NULLABLE:
            if job.get(f) in ("", None):
                job[f] = None
        job["retryable"] = job.get("retryable") == "1"
        return job

    def create(self, *, kind: str, source_url: str, video_id: str | None, client_id: str, extra: dict | None = None) -> dict:
        now = time.time()
        job_id = uuid.uuid4().hex
        fields = {
            "job_id": job_id,
            "kind": kind,
            "video_id": video_id or "",
            "source_url": source_url,
            "status": JobStatus.QUEUED.value,
            "stage": "queued",
            "progress": 0,
            "retry_count": 0,
            "error_code": "",
            "error_message": "",
            "retryable": "0",
            "client_id": client_id,
            "created_at": now,
            "updated_at": now,
            "completed_at": "",
        }
        fields.update(extra or {})
        r = self._r()
        r.hset(_jkey(job_id), mapping=fields)
        r.expire(_jkey(job_id), settings.job_ttl_seconds)
        return self.get(job_id)

    def update(self, job_id: str, *, status: JobStatus | None = None, **fields) -> None:
        patch: dict = {"updated_at": time.time()}
        if status is not None:
            patch["status"] = status.value
            if status in TERMINAL:
                patch["completed_at"] = time.time()
        for k, v in fields.items():
            if isinstance(v, bool):
                v = "1" if v else "0"
            patch[k] = "" if v is None else v
        self._r().hset(_jkey(job_id), mapping=patch)

    def mark_failed(self, job_id: str, err: ScrybeError) -> None:
        self.update(
            job_id,
            status=JobStatus.FAILED,
            stage="failed",
            error_code=err.code.value,
            error_message=err.user_message,
            retryable=err.retryable,
        )

    def mark_completed(self, job_id: str) -> None:
        self.update(
            job_id, status=JobStatus.COMPLETED, stage="completed", progress=100, error_code=None, error_message=None, retryable=False
        )

    def incr_retry(self, job_id: str) -> int:
        return int(self._r().hincrby(_jkey(job_id), "retry_count", 1))

    # -- idempotency: one in-flight/completed job per video ------------------
    def find_or_create_for_video(self, *, video_id: str, source_url: str, client_id: str) -> tuple[dict, bool]:
        """Returns (job, created). Re-submitting a video that is queued, running
        or completed returns the existing job; only a *failed* one is replaced."""
        r = self._r()
        mkey = f"video_job:{video_id}"
        for _ in range(3):
            existing_id = r.get(mkey)
            if existing_id:
                existing = self.get(existing_id)
                if existing and existing["status"] != JobStatus.FAILED.value:
                    return existing, False
            job = self.create(kind="video", source_url=source_url, video_id=video_id, client_id=client_id)
            # NX when nothing is mapped; otherwise only replace the failed one we just saw.
            if not existing_id and r.set(mkey, job["job_id"], nx=True, ex=settings.job_ttl_seconds):
                return job, True
            if existing_id and r.get(mkey) == existing_id:
                r.set(mkey, job["job_id"], ex=settings.job_ttl_seconds)
                return job, True
            r.delete(_jkey(job["job_id"]))  # lost the race; re-read the winner
        raise ScrybeError(ErrorCode.INTERNAL_ERROR, "could not allocate job")

    # -- per-client accounting -------------------------------------------------
    def active_jobs_for_client(self, client_id: str) -> int:
        r = self._r()
        key = f"client_jobs:{client_id}"
        active = 0
        for jid in r.smembers(key):
            job = self.get(jid)
            if not job or job["status"] in {s.value for s in TERMINAL}:
                r.srem(key, jid)
            else:
                active += 1
        return active

    def track_client_job(self, client_id: str, job_id: str) -> None:
        r = self._r()
        r.sadd(f"client_jobs:{client_id}", job_id)
        r.expire(f"client_jobs:{client_id}", settings.job_ttl_seconds)


def public_view(job: dict) -> dict:
    """What the API returns. No client_id, no source internals, no tracebacks."""
    return {
        "job_id": job["job_id"],
        "video_id": job.get("video_id") or None,
        "status": job["status"],
        "stage": job.get("stage"),
        "progress": job.get("progress", 0),
        "error_code": job.get("error_code"),
        "error_message": job.get("error_message"),
        "retryable": job.get("retryable", False),
        "retry_count": job.get("retry_count", 0),
        "created_at": float(job["created_at"]),
        "updated_at": float(job["updated_at"]),
        "completed_at": float(job["completed_at"]) if job.get("completed_at") else None,
    }
