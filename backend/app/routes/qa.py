from fastapi import APIRouter, Depends, HTTPException

from app.ask.graph import run_ask
from app.ask.models import AskRequest, AskResponse
from app.models.schemas import QARequest
from app.observability import new_request_id
from app.ratelimit import enforce_api_rate_limit
from app.validation import is_valid_video_id

router = APIRouter(tags=["ask"], dependencies=[Depends(enforce_api_rate_limit)])


@router.post("/ask", response_model=AskResponse)
def ask(payload: AskRequest):
    """Ask Scrybe: grounded answers, quizzes, study plans, comparisons."""
    return run_ask(payload, new_request_id())


@router.post("/qa", response_model=AskResponse)
def qa_legacy(payload: QARequest):
    """Backwards-compatible single-video endpoint (same agent, same response)."""
    if not is_valid_video_id(payload.video_id):
        raise HTTPException(404, "This video hasn't been indexed yet -- has processing finished?")
    return run_ask(AskRequest(video_ids=[payload.video_id], question=payload.question), new_request_id())
