from fastapi import APIRouter, HTTPException

from app.agents.qa_agent import answer_question
from app.models.schemas import QAAnswer, QARequest
from app.validation import is_valid_video_id

router = APIRouter(prefix="/qa", tags=["qa"])


@router.post("", response_model=QAAnswer)
def ask(payload: QARequest):
    if not is_valid_video_id(payload.video_id):
        raise HTTPException(404, "This video hasn't been indexed yet -- has processing finished?")
    try:
        result = answer_question(payload.video_id, payload.question)
    except FileNotFoundError:
        # VideoIndex.load() raises this when the FAISS index for this
        # video_id doesn't exist yet -- surface it as a clean 404 instead
        # of a raw 500, same as the report/export endpoints do for the
        # same "hasn't finished processing" case.
        raise HTTPException(404, "This video hasn't been indexed yet -- has processing finished?")
    return QAAnswer(**result)
