from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class VideoSubmitRequest(BaseModel):
    youtube_url: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "done", "failed"]
    video_id: Optional[str] = None
    error: Optional[str] = None


class Chapter(BaseModel):
    title: str
    start_seconds: float
    end_seconds: float
    summary: str


class Claim(BaseModel):
    text: str
    timestamp_seconds: Optional[float] = None
    verified: Optional[bool] = None
    verification_note: Optional[str] = None


class VideoReport(BaseModel):
    video_id: str
    summary: str
    chapters: List[Chapter]
    claims: List[Claim]


class QARequest(BaseModel):
    video_id: str
    question: str


class QAAnswer(BaseModel):
    answer: str
    timestamp_seconds: Optional[float] = None
    source_snippets: List[str] = Field(default_factory=list)


class CompareRequest(BaseModel):
    youtube_urls: List[str]
    focus: Optional[str] = None
