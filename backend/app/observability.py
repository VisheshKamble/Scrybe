"""Structured, secret-free tracing for jobs and AI requests.

Every span logs one JSON line: request_id, job_id, agent, tool, model,
latency_ms, success, token counts, retrieved chunk ids. Prompts, evidence text
and API keys are never logged.
"""

from __future__ import annotations

import contextvars
import json
import logging
import time
import uuid
from contextlib import contextmanager

logger = logging.getLogger("scrybe")
_request_id: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")
_SAFE_KEYS = {
    "job_id",
    "video_id",
    "video_ids",
    "agent",
    "tool",
    "model",
    "intent",
    "stage",
    "error_code",
    "prompt_tokens",
    "completion_tokens",
    "est_cost_usd",
    "chunk_ids",
    "n_results",
    "top_score",
    "attempt",
    "steps",
    "confidence",
    "grounding",
}


def new_request_id() -> str:
    rid = uuid.uuid4().hex[:12]
    _request_id.set(rid)
    return rid


def current_request_id() -> str:
    return _request_id.get()


def log_event(event: str, **fields) -> None:
    payload = {"event": event, "request_id": current_request_id()}
    payload.update({k: v for k, v in fields.items() if k in _SAFE_KEYS or k in ("latency_ms", "success")})
    logger.info(json.dumps(payload, default=str, sort_keys=True))


@contextmanager
def span(event: str, **fields):
    """`with span("tool", tool="retrieve_chunks") as s: ...; s["n_results"] = 5`"""
    data: dict = dict(fields)
    start = time.perf_counter()
    try:
        yield data
        data["success"] = True
    except BaseException as exc:
        data["success"] = False
        data.setdefault("error_code", getattr(getattr(exc, "code", None), "value", type(exc).__name__))
        raise
    finally:
        data["latency_ms"] = round((time.perf_counter() - start) * 1000, 1)
        log_event(event, **data)
