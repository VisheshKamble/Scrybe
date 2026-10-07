from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.validation import is_valid_video_id

Level = Literal["beginner", "intermediate", "advanced", "interview"]


class AskRequest(BaseModel):
    video_ids: list[str] = Field(min_length=1, max_length=5)
    question: str = Field(min_length=1, max_length=1000)
    level: Optional[Level] = None
    length: Literal["short", "detailed"] = "short"
    mode: Literal["auto", "answer", "teach", "quiz", "study_plan", "compare"] = "auto"

    @field_validator("video_ids")
    @classmethod
    def _ids(cls, v):
        if any(not is_valid_video_id(x) for x in v):
            raise ValueError("invalid video id")
        return list(dict.fromkeys(v))


class Citation(BaseModel):
    evidence_id: str
    video_id: str
    start_seconds: float
    end_seconds: float
    source: str
    snippet: str
    score: Optional[float] = None


class AskResponse(BaseModel):
    request_id: str
    intent: str
    answer: str
    confidence: Literal["high", "medium", "low", "none"]
    grounded: bool
    citations: list[Citation] = []
    quiz: Optional[list[dict]] = None
    study_plan: Optional[list[dict]] = None
    comparison: Optional[dict] = None
    trace: list[dict] = []
    notes: list[str] = []
    cached: bool = False
    usage: dict = {}
    # legacy /qa fields
    timestamp_seconds: Optional[float] = None
    source_snippets: list[str] = []
