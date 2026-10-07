from fastapi import APIRouter, Depends, Request

from app import quiz_stats
from app.errors import ErrorCode, ScrybeError
from app.ratelimit import client_id, enforce_api_rate_limit
from app.validation import is_valid_video_id

router = APIRouter(prefix="/quiz", tags=["quiz"], dependencies=[Depends(enforce_api_rate_limit)])


@router.post("/results")
def post_result(payload: quiz_stats.QuizResult, request: Request):
    if not is_valid_video_id(payload.video_id):
        raise ScrybeError(ErrorCode.INDEX_NOT_FOUND, "bad video id")
    return quiz_stats.record(client_id(request), payload)


@router.get("/stats/{video_id}")
def get_stats(video_id: str, request: Request):
    if not is_valid_video_id(video_id):
        raise ScrybeError(ErrorCode.INDEX_NOT_FOUND, "bad video id")
    return quiz_stats.stats(client_id(request), video_id)
