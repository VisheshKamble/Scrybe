"""Reports live in object storage so the API can read what a worker wrote,
even when they run on different machines."""

from __future__ import annotations

import json

from app.errors import ErrorCode, ScrybeError
from app.storage import get_storage


def _key(video_id: str) -> str:
    return f"reports/{video_id}.json"


def save_report(video_id: str, report: dict) -> None:
    get_storage().upload(_key(video_id), json.dumps(report), "application/json")


def report_exists(video_id: str) -> bool:
    return get_storage().exists(_key(video_id))


def load_report(video_id: str) -> dict:
    if not report_exists(video_id):
        raise ScrybeError(ErrorCode.INDEX_NOT_FOUND, f"no report for {video_id}")
    return json.loads(get_storage().download(_key(video_id)))
