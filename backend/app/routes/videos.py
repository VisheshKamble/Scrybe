from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.errors import ErrorCode, ScrybeError
from app.jobs import JobStore, public_view
from app.models.schemas import JobStatusResponse, VideoSubmitRequest
from app.ratelimit import client_id, enforce_api_rate_limit
from app.report_store import load_report
from app.services import submit_video
from app.validation import is_valid_job_id, is_valid_video_id

router = APIRouter(prefix="/videos", tags=["videos"], dependencies=[Depends(enforce_api_rate_limit)])


def _status_model(job: dict) -> JobStatusResponse:
    view = public_view(job)
    return JobStatusResponse(**view, error=view["error_message"])


@router.post("", response_model=JobStatusResponse)
def create_video_job(payload: VideoSubmitRequest, request: Request):
    """Creates (or returns the existing) job and returns immediately."""
    job, _created = submit_video(payload.youtube_url, client_id(request))
    return _status_model(job)


@router.get("/{job_id}", response_model=JobStatusResponse)
@router.get("/{job_id}/status", response_model=JobStatusResponse, include_in_schema=False)  # legacy path
def get_job(job_id: str):
    job = JobStore().get(job_id) if is_valid_job_id(job_id) else None
    if not job:
        raise ScrybeError(ErrorCode.JOB_NOT_FOUND)
    return _status_model(job)


@router.get("/{video_id}/report")
def get_report(video_id: str):
    if not is_valid_video_id(video_id):
        raise HTTPException(404, "Report not found -- has this video finished processing?")
    try:
        return load_report(video_id)
    except ScrybeError:
        raise HTTPException(404, "Report not found -- has this video finished processing?") from None


MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024


@router.post("/screenshot")
async def submit_screenshot(video_id: str, file: UploadFile = File(...)):
    from app.ingestion.screenshots import save_uploaded_screenshot

    if not is_valid_video_id(video_id):
        raise HTTPException(404, "Unknown video.")
    data = await file.read(MAX_SCREENSHOT_BYTES + 1)
    if len(data) > MAX_SCREENSHOT_BYTES:
        raise HTTPException(413, "Screenshot too large (max 5 MB).")
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    return {"video_id": video_id, "saved_path": save_uploaded_screenshot(data, ext)}
