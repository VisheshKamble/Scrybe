from typing import Optional

from pydantic import BaseModel, Field


class VideoSubmitRequest(BaseModel):
    youtube_url: str = Field(max_length=2048)


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    video_id: Optional[str] = None
    stage: Optional[str] = None
    progress: int = 0
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    retryable: bool = False
    retry_count: int = 0
    created_at: Optional[float] = None
    updated_at: Optional[float] = None
    completed_at: Optional[float] = None
    # legacy alias for older clients: set to the user-safe message
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
    chapters: list[Chapter]
    claims: list[Claim]


class QARequest(BaseModel):
    video_id: str
    question: str = Field(min_length=1, max_length=1000)


class CompareRequest(BaseModel):
    youtube_urls: list[str] = Field(max_length=5)
    focus: Optional[str] = Field(default=None, max_length=300)
