import subprocess
import uuid
from pathlib import Path

DOWNLOAD_DIR = Path("data/videos")
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


def download_video(youtube_url: str) -> dict:
    """Downloads a YouTube video (with muxed audio) via yt-dlp, and pulls
    auto-generated captions if they exist. Caption absence is what triggers
    the Whisper fallback in the transcript agent.
    """
    video_id = str(uuid.uuid4())[:8]
    out_template = str(DOWNLOAD_DIR / f"{video_id}.%(ext)s")

    subprocess.run(
        [
            "yt-dlp",
            "-f", "best[height<=720]",
            "--write-auto-sub", "--sub-lang", "en",
            "--convert-subs", "srt",
            "-o", out_template,
            youtube_url,
        ],
        check=True,
    )

    video_path = DOWNLOAD_DIR / f"{video_id}.mp4"
    caption_path = DOWNLOAD_DIR / f"{video_id}.en.srt"

    return {
        "video_id": video_id,
        "video_path": str(video_path),
        "caption_path": str(caption_path) if caption_path.exists() else None,
    }
