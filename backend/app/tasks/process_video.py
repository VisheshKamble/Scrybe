import json
import os
from pathlib import Path

from app.agents.graph import video_graph
from app.celery_app import celery_app
from app.config import settings
from app.ingestion.audio import extract_audio
from app.ingestion.keyframes import extract_keyframes
from app.ingestion.youtube import download_video
from app.vectorstore.index import VideoIndex

REPORT_DIR = Path("data/reports")
REPORT_DIR.mkdir(parents=True, exist_ok=True)


def _remove_quietly(path: str | None) -> None:
    """Best-effort delete -- cleanup failing is never worth losing a
    report over, so this only ever logs to stdout (visible in the worker's
    own logs) rather than raising.
    """
    if not path:
        return
    try:
        os.remove(path)
    except OSError as exc:
        print(f"process_video_task: couldn't clean up '{path}': {exc}")


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

    # Only pull an audio-only track when it'll actually be used -- skip the
    # extra encode entirely when YouTube's captions already cover it.
    # Previously this passed `download["video_path"]` (the full muxed
    # video, video stream included) straight to Whisper, which is what
    # caused the 413s: the video stream dwarfs the audio and blew past
    # Groq's upload limit on anything longer than a few minutes.
    audio_path = None
    if not download.get("caption_path"):
        audio_path = extract_audio(download["video_path"], video_id)

    # The downloaded video file itself is only ever an input to the two
    # extraction calls above -- nothing downstream reads it (the frontend
    # plays the video via a YouTube iframe embed, not this local copy),
    # and it's by far the largest file this pipeline writes to disk.
    # Without this, `data/videos` grows by one full video per run,
    # forever, for a file nothing will ever read again.
    _remove_quietly(download["video_path"])

    state = {
        "video_id": video_id,
        "video_path": download["video_path"],
        "audio_path": audio_path,
        "caption_path": download.get("caption_path"),
        "keyframes": keyframes,
    }

    result = video_graph.invoke(state)

    # Same reasoning as the video file above, just one step later: the
    # extracted audio track is only read inside run_transcript_agent
    # (during video_graph.invoke, just above), never again after.
    _remove_quietly(audio_path)

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
