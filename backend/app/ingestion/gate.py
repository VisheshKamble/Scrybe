"""Cluster-wide YouTube politeness: concurrency cap, request spacing and an
IP-block cooldown, all in Redis so every worker process obeys the same limits.

Why: Scrybe must not be its own YouTube IP blocker. Without this, N workers
each discover a block independently by hammering YouTube.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass

from app import redis_client
from app.config import settings

_SLOTS = "youtube:slots"
_SPACING = "youtube:spacing"
_COOLDOWN = "youtube:cooldown"


@dataclass
class GateDecision:
    token: str | None
    wait_seconds: int = 0
    reason: str = ""

    @property
    def acquired(self) -> bool:
        return self.token is not None


def cooldown_remaining() -> int:
    ttl = redis_client.get_redis().ttl(_COOLDOWN)
    return max(int(ttl), 0)


def trip_cooldown(seconds: int | None = None) -> None:
    redis_client.get_redis().set(_COOLDOWN, "1", ex=seconds or settings.youtube_cooldown_seconds)


def try_acquire() -> GateDecision:
    r = redis_client.get_redis()
    cd = cooldown_remaining()
    if cd:
        return GateDecision(None, cd, "cooldown")

    now = time.time()
    lease = settings.youtube_download_timeout_seconds + 60
    r.zremrangebyscore(_SLOTS, "-inf", now)  # drop leases of crashed workers
    token = uuid.uuid4().hex
    r.zadd(_SLOTS, {token: now + lease})
    if r.zrank(_SLOTS, token) >= settings.youtube_max_concurrent_downloads:
        r.zrem(_SLOTS, token)
        return GateDecision(None, 15, "concurrency")

    delay_ms = int(settings.youtube_min_request_delay * 1000)
    if delay_ms > 0 and not r.set(_SPACING, "1", nx=True, px=delay_ms):
        r.zrem(_SLOTS, token)
        pttl = r.pttl(_SPACING)
        return GateDecision(None, max(1, int(pttl / 1000) + 1), "spacing")
    return GateDecision(token)


def release(token: str | None) -> None:
    if token:
        redis_client.get_redis().zrem(_SLOTS, token)
