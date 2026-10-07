"""Quiz result tracking. Stores only counters (no questions, answers or text)
per (anonymous client, video). Clients are IP-derived until auth exists, so
treat these as convenience stats, not identity-bound records."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from app import redis_client
from app.config import settings

Difficulty = Literal["easy", "medium", "hard"]


class QuizResult(BaseModel):
    video_id: str
    correct: bool
    difficulty: Difficulty = "medium"
    type: Literal["mcq", "true_false", "short_answer", "interview"] = "mcq"


def _key(client: str, video_id: str) -> str:
    return f"quiz_stats:{client}:{video_id}"


def record(client: str, r: QuizResult) -> dict:
    rd = redis_client.get_redis()
    k = _key(client, r.video_id)
    pipe = rd.pipeline()
    pipe.hincrby(k, "total", 1)
    pipe.hincrby(k, f"total:{r.difficulty}", 1)
    if r.correct:
        pipe.hincrby(k, "correct", 1)
        pipe.hincrby(k, f"correct:{r.difficulty}", 1)
    pipe.expire(k, settings.job_ttl_seconds * 4)
    pipe.execute()
    return stats(client, r.video_id)


def stats(client: str, video_id: str) -> dict:
    raw = redis_client.get_redis().hgetall(_key(client, video_id))
    g = lambda f: int(raw.get(f, 0))  # noqa: E731
    out = {"video_id": video_id, "total": g("total"), "correct": g("correct"), "by_difficulty": {}}
    for d in ("easy", "medium", "hard"):
        out["by_difficulty"][d] = {"total": g(f"total:{d}"), "correct": g(f"correct:{d}")}
    out["accuracy"] = round(out["correct"] / out["total"], 3) if out["total"] else None
    return out
