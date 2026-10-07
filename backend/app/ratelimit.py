"""Redis-backed limits, shared by every API instance (no process-local state)."""

from __future__ import annotations

import logging
import time

from fastapi import Request

from app import redis_client
from app.config import settings
from app.errors import ErrorCode, ScrybeError

log = logging.getLogger("scrybe")


def client_id(request: Request) -> str:
    """Best-effort client identity (no auth yet). Behind a proxy the first
    X-Forwarded-For hop is used; that header is spoofable if the API is
    reachable without the proxy, hence `TRUST_FORWARDED_FOR`."""
    if settings.trust_forwarded_for:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()[:64] or "unknown"
    return (request.client.host if request.client else "unknown")[:64]


def check_fixed_window(bucket: str, limit: int, window_seconds: int) -> tuple[bool, int]:
    """INCR + EXPIRE fixed window. Returns (allowed, retry_after_seconds).
    Fails *open* if Redis is unreachable (availability over strictness); the
    submit path needs Redis anyway and will fail loudly there."""
    try:
        r = redis_client.get_redis()
        window = int(time.time() // window_seconds)
        key = f"rl:{bucket}:{window}"
        pipe = r.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds + 1)
        count, _ = pipe.execute()
        if int(count) > limit:
            return False, window_seconds - int(time.time() % window_seconds)
        return True, 0
    except Exception as exc:  # pragma: no cover - exercised via integration
        log.warning("rate limiter unavailable, failing open: %s", type(exc).__name__)
        return True, 0


def enforce_api_rate_limit(request: Request) -> None:
    ok, retry = check_fixed_window(f"api:{client_id(request)}", settings.api_rate_limit, 60)
    if not ok:
        err = ScrybeError(ErrorCode.RATE_LIMITED, f"api rate limit, retry in {retry}s")
        err.retry_after = retry  # type: ignore[attr-defined]
        raise err


def enforce_submission_limits(cid: str, active_jobs: int) -> None:
    ok, retry = check_fixed_window(f"jobs:{cid}", settings.max_video_jobs_per_user, 24 * 3600)
    if not ok:
        err = ScrybeError(ErrorCode.RATE_LIMITED, "daily job quota reached")
        err.retry_after = retry  # type: ignore[attr-defined]
        raise err
    if active_jobs >= settings.max_active_jobs_per_user:
        raise ScrybeError(ErrorCode.RATE_LIMITED, "too many active jobs", retryable=True)
