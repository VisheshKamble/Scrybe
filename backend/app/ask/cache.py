"""Answer cache (cost control).

Key = hash(video ids, normalized question, mode, level, length) + each video's
index version, so rebuilding an index invalidates its cached answers. Only
grounded answers are cached (never fallbacks, never errors). Any Redis problem
degrades to "no cache"; it must never break answering.
"""

from __future__ import annotations

import hashlib
import json
import logging

from app import redis_client
from app.ask.models import AskRequest, AskResponse
from app.config import settings

log = logging.getLogger("scrybe")


def _key(req: AskRequest) -> str:
    r = redis_client.get_redis()
    versions = [r.get(f"index_ver:{v}") or "0" for v in req.video_ids]
    material = json.dumps([req.video_ids, " ".join(req.question.lower().split()), req.mode, req.level, req.length, versions])
    return "ask_cache:" + hashlib.sha256(material.encode()).hexdigest()


def get(req: AskRequest) -> AskResponse | None:
    if settings.answer_cache_ttl_seconds <= 0:
        return None
    try:
        raw = redis_client.get_redis().get(_key(req))
        return AskResponse.model_validate_json(raw) if raw else None
    except Exception as exc:  # noqa: BLE001
        log.warning("answer cache read failed: %s", type(exc).__name__)
        return None


def put(req: AskRequest, resp: AskResponse) -> None:
    if settings.answer_cache_ttl_seconds <= 0 or resp.confidence == "none":
        return
    try:
        redis_client.get_redis().set(_key(req), resp.model_dump_json(), ex=settings.answer_cache_ttl_seconds)
    except Exception as exc:  # noqa: BLE001
        log.warning("answer cache write failed: %s", type(exc).__name__)
