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
            # Without this, a URL that carries a `list=...` param (e.g. one
            # copied from an "up next"/playlist context) makes yt-dlp
            # download the *entire* playlist instead of the single video
            # this pipeline is built around -- silently, no error, just
            # hundreds of downloads all landing on the same output path.
            "--no-playlist",
            # Modern YouTube often only exposes <=720p as separate video-
            # only + audio-only streams rather than one progressive file,
            # so fall back to merging them if a combined stream isn't
            # available.
            "-f", "bv*[height<=720]+ba/b[height<=720]/best",
            "--merge-output-format", "mp4",
            "-o", out_template,
            youtube_url,
        ],
        check=True,
    )

    # Captions are fetched as a second, separate call and are allowed to
    # fail (check=False). YouTube's caption endpoint gets rate-limited
    # (HTTP 429) independently of -- and more often than -- the video CDN,
    # and yt-dlp has no flag to make a subtitle-only failure non-fatal: it
    # aborts the *entire* run, video included, if captions 429
    # (https://github.com/yt-dlp/yt-dlp/issues/14153, still open upstream).
    # A missing caption file here is already a handled case -- it's exactly
    # what triggers the Whisper fallback in the transcript agent below.
    subprocess.run(
        [
            "yt-dlp",
            "--no-playlist",
            "--skip-download",
            "--write-auto-sub", "--sub-lang", "en",
            "--convert-subs", "srt",
            "-o", out_template,
            youtube_url,
        ],
        check=False,
    )

    video_path = DOWNLOAD_DIR / f"{video_id}.mp4"
    caption_path = DOWNLOAD_DIR / f"{video_id}.en.srt"

    return {
        "video_id": video_id,
        "video_path": str(video_path),
        "caption_path": str(caption_path) if caption_path.exists() else None,
    }
