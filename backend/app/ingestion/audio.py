import subprocess
from pathlib import Path

from app.config import settings

AUDIO_DIR = Path("data/audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def extract_audio(video_path: str, video_id: str) -> str:
    """Pulls just the audio track out of the downloaded video.

    This is the actual fix for the 413s: `process_video_task` used to pass
    the *whole muxed video file* (video stream included) to
    `transcribe_with_whisper`, because yt-dlp keeps audio and video in one
    container. Whisper never needed the video stream -- it was dead weight
    on every upload, and it's what made even moderate-length videos blow
    past Groq's ~25MB limit.

    Downmixing to mono, resampling to 16kHz (Whisper's native rate, so
    nothing is lost), and encoding at a modest bitrate shrinks the payload
    by roughly 10-20x before chunking (see transcript_agent.py) is even
    needed. `-c copy` isn't used here on purpose: we're changing codec
    parameters (mono, 16kHz, low bitrate), not just remuxing.
    """
    out_path = AUDIO_DIR / f"{video_id}.mp3"
    try:
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", video_path,
                "-vn",  # drop the video stream entirely
                "-ac", "1",  # mono
                "-ar", str(settings.audio_sample_rate_hz),
                "-b:a", f"{settings.audio_bitrate_kbps}k",
                "-c:a", "libmp3lame",
                str(out_path),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(
            f"ffmpeg failed to extract audio from '{video_path}': {exc.stderr}"
        ) from exc

    return str(out_path)


def get_audio_duration_seconds(audio_path: str) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            audio_path,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())
