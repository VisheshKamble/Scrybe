from fastapi import APIRouter

from app.agents.qa_agent import answer_question
from app.models.schemas import QAAnswer, QARequest

router = APIRouter(prefix="/qa", tags=["qa"])


@router.post("", response_model=QAAnswer)
def ask(payload: QARequest):
    result = answer_question(payload.video_id, payload.question)
    return QAAnswer(**result)
