import json
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.celery_app import celery_app
from app.ingestion.screenshots import save_uploaded_screenshot
from app.models.schemas import JobStatusResponse, VideoSubmitRequest
from app.tasks.process_video import process_video_task

router = APIRouter(prefix="/videos", tags=["videos"])
REPORT_DIR = Path("data/reports")


@router.post("", response_model=JobStatusResponse)
def submit_video(payload: VideoSubmitRequest):
    task = process_video_task.delay(payload.youtube_url)
    return JobStatusResponse(job_id=task.id, status="queued")


@router.get("/{job_id}/status", response_model=JobStatusResponse)
def get_status(job_id: str):
    result = celery_app.AsyncResult(job_id)
    if result.state == "SUCCESS":
        return JobStatusResponse(job_id=job_id, status="done", video_id=result.result["video_id"])
    if result.state == "FAILURE":
        return JobStatusResponse(job_id=job_id, status="failed", error=str(result.result))
    if result.state == "STARTED":
        return JobStatusResponse(job_id=job_id, status="processing")
    return JobStatusResponse(job_id=job_id, status="queued")


@router.get("/{video_id}/report")
def get_report(video_id: str):
    path = REPORT_DIR / f"{video_id}.json"
    if not path.exists():
        raise HTTPException(404, "Report not found -- has this video finished processing?")
    return json.loads(path.read_text())


@router.post("/screenshot")
async def submit_screenshot(video_id: str, file: UploadFile = File(...)):
    extension = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    path = save_uploaded_screenshot(await file.read(), extension)
    return {"video_id": video_id, "saved_path": path}
