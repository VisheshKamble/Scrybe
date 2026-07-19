import json
from pathlib import Path

from app.agents.graph import video_graph
from app.celery_app import celery_app
from app.config import settings
from app.ingestion.keyframes import extract_keyframes
from app.ingestion.youtube import download_video
from app.vectorstore.index import VideoIndex

REPORT_DIR = Path("data/reports")
REPORT_DIR.mkdir(parents=True, exist_ok=True)


@celery_app.task(bind=True)
def process_video_task(self, youtube_url: str) -> dict:
    """The whole pipeline for one video, run in a background worker so the
    HTTP request that kicked it off returns immediately.
    """
    download = download_video(youtube_url)
    video_id = download["video_id"]

    keyframes = extract_keyframes(
        download["video_path"], video_id, max_frames=settings.max_keyframes_per_video
    )

    state = {
        "video_id": video_id,
        "video_path": download["video_path"],
        "audio_path": download["video_path"],  # yt-dlp keeps audio muxed in
        "caption_path": download.get("caption_path"),
        "keyframes": keyframes,
    }

    result = video_graph.invoke(state)

    chunks = [
        {"text": s["text"], "timestamp_seconds": s["start"], "source": "transcript"}
        for s in result["transcript_segments"]
    ] + [
        {"text": v["description"], "timestamp_seconds": v["timestamp_seconds"], "source": "visual"}
        for v in result["visual_descriptions"] if v["description"]
    ]
    VideoIndex(video_id).build(chunks)

    report = {
        "video_id": video_id,
        "summary": result["summary"],
        "chapters": result["chapters"],
        "claims": result["claims"],
    }
    (REPORT_DIR / f"{video_id}.json").write_text(json.dumps(report))

    return report
