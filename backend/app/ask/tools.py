"""Explicit, typed, size-limited tools the agent may call. There is
deliberately no shell/Python/network tool."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.config import settings
from app.errors import ErrorCode, ScrybeError
from app.observability import span
from app.report_store import load_report
from app.validation import is_valid_video_id
from app.vectorstore.index import VideoIndex


class RetrieveInput(BaseModel):
    video_ids: list[str] = Field(min_length=1, max_length=5)
    query: str = Field(min_length=1, max_length=1000)
    k: int = Field(default=8, ge=1, le=20)
    min_score: float = Field(default=0.0, ge=-1.0, le=1.0)

    @field_validator("video_ids")
    @classmethod
    def _v(cls, v):
        if not all(is_valid_video_id(x) for x in v):
            raise ValueError("invalid video id")
        return v


class TimeContextInput(BaseModel):
    video_id: str
    start_seconds: float = Field(ge=0)
    end_seconds: float = Field(ge=0)
    limit: int = Field(default=6, ge=1, le=12)


def retrieve_chunks(inp: RetrieveInput) -> list[dict]:
    """Semantic top-k per video, merged and ranked by similarity. k applies per
    video so one long video can't crowd out the others in multi-video asks."""
    results: list[dict] = []
    with span("tool", tool="retrieve_chunks") as s:
        for vid in inp.video_ids:
            results.extend(VideoIndex(vid).search(inp.query, k=inp.k, min_score=inp.min_score))
        results.sort(key=lambda c: c["score"], reverse=True)
        s["n_results"] = len(results)
        s["chunk_ids"] = [c["chunk_id"] for c in results]
        s["top_score"] = results[0]["score"] if results else None
    return results


def get_timestamp_context(inp: TimeContextInput) -> list[dict]:
    with span("tool", tool="get_timestamp_context") as s:
        chunks = VideoIndex(inp.video_id).in_range(inp.start_seconds, inp.end_seconds, inp.limit)
        s["n_results"] = len(chunks)
        s["chunk_ids"] = [c["chunk_id"] for c in chunks]
    return [{**c, "score": 1.0} for c in chunks]


def get_video_metadata(video_id: str) -> dict:
    report = load_report(video_id)
    chapters = report.get("chapters", [])
    return {"video_id": video_id, "chapters": chapters, "duration_seconds": max((c.get("end_seconds", 0) for c in chapters), default=0)}


def get_chapters_as_evidence(video_ids: list[str]) -> list[dict]:
    """Chapters (title+summary+time span) as evidence items for study plans."""
    out = []
    for vid in video_ids:
        try:
            meta = get_video_metadata(vid)
        except ScrybeError as exc:
            if exc.code == ErrorCode.INDEX_NOT_FOUND:
                continue
            raise
        for i, c in enumerate(meta["chapters"][:40]):
            out.append(
                {
                    "chunk_id": f"{vid}:ch{i}",
                    "video_id": vid,
                    "start_time": float(c["start_seconds"]),
                    "end_time": float(c["end_seconds"]),
                    "source": "chapter",
                    "score": 1.0,
                    "text": f"{c['title']}: {c['summary']}",
                }
            )
    return out


def select_evidence(chunks: list[dict], max_chars: int | None = None) -> list[dict]:
    """Dedupe, cap total size, and assign stable ids E1..En."""
    max_chars = max_chars or settings.evidence_max_chars
    seen, picked, used = set(), [], 0
    for c in chunks:
        if c["chunk_id"] in seen:
            continue
        if used + len(c["text"]) > max_chars and picked:
            break
        seen.add(c["chunk_id"])
        picked.append(c)
        used += len(c["text"])
    return [{**c, "evidence_id": f"E{i + 1}"} for i, c in enumerate(picked)]
