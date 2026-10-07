"""One shared Redis client factory. Honors the existing `REDIS_URL` verbatim,
including `rediss://` (Upstash TLS) -- do not rewrite or normalise the URL.

Tests replace `get_redis` (monkeypatch) with a fakeredis instance.
"""

from __future__ import annotations

from functools import lru_cache

import redis

from app.config import settings


@lru_cache(maxsize=1)
def get_redis() -> redis.Redis:
    return redis.from_url(settings.redis_url, decode_responses=True)
