"""YouTube download via yt-dlp.

Two separate failure classes are handled separately:
  A. extractor / player challenges  -> JS runtime (deno + ejs) and an optional
     PO Token provider plugin (bgutil). These make extraction *possible*.
  B. IP-level throttling (HTTP 429 / "confirm you're not a bot") -> detected,
     classified, and handled by the gate's cooldown + job retry policy.
A PO Token does NOT remove (B): a flagged datacenter IP can still be blocked.
"""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path

from app.config import settings
from app.errors import ErrorCode, ScrybeError, classify_ytdlp_output
from app.validation import canonical_youtube_url

log = logging.getLogger("scrybe")


def _common_args() -> list[str]:
    args = [
        "yt-dlp",
        "--no-playlist",
        "--no-warnings",
        "--js-runtimes",
        "deno",
        "--remote-components",
        "ejs:github",
        "--retries",
        "2",
        "--fragment-retries",
        "2",
        "--extractor-retries",
        "1",  # bounded, never infinite
        "--socket-timeout",
        "30",
        "--sleep-requests",
        "1",
    ]
    if settings.bgutil_base_url:
        args += ["--extractor-args", f"youtubepot-bgutilhttp:base_url={settings.bgutil_base_url}"]
    if settings.ytdlp_proxy:
        args += ["--proxy", settings.ytdlp_proxy]
    if settings.ytdlp_cookies_file:
        args += ["--cookies", settings.ytdlp_cookies_file]
    return args


def build_video_args(url: str, out_template: str) -> list[str]:
    h = settings.youtube_max_height
    return _common_args() + [
        "-f",
        f"bv*[height<={h}]+ba/b[height<={h}]/best",
        "--merge-output-format",
        "mp4",
        "-o",
        out_template,
        "--",
        url,
    ]


def build_caption_args(url: str, out_template: str) -> list[str]:
    return _common_args() + [
        "--skip-download",
        "--write-auto-sub",
        "--write-sub",
        "--sub-lang",
        "en",
        "--convert-subs",
        "srt",
        "-o",
        out_template,
        "--",
        url,
    ]


def download_video(youtube_url: str, video_id: str, work_dir: Path) -> dict:
    """Download into `work_dir` (caller owns cleanup). Raises ScrybeError."""
    try:
        url = canonical_youtube_url(youtube_url)  # only the rebuilt URL reaches yt-dlp
    except ValueError as exc:
        raise ScrybeError(ErrorCode.INVALID_URL, str(exc)) from exc

    work_dir.mkdir(parents=True, exist_ok=True)
    out_template = str(work_dir / f"{video_id}.%(ext)s")
    try:
        proc = subprocess.run(
            build_video_args(url, out_template),
            capture_output=True,
            text=True,
            timeout=settings.youtube_download_timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        raise ScrybeError(ErrorCode.YOUTUBE_NETWORK_ERROR, "yt-dlp timed out") from exc
    except FileNotFoundError as exc:
        raise ScrybeError(ErrorCode.INTERNAL_ERROR, "yt-dlp is not installed", retryable=False) from exc
    if proc.returncode != 0:
        raise classify_ytdlp_output(proc.stderr or proc.stdout)

    video_path = work_dir / f"{video_id}.mp4"
    if not video_path.exists():
        raise ScrybeError(ErrorCode.YOUTUBE_EXTRACTOR_ERROR, "yt-dlp succeeded but produced no mp4")

    # Captions are a separate, allowed-to-fail call: a missing caption file is
    # the normal trigger for the Whisper fallback (yt-dlp can't make subtitle
    # failures non-fatal within the video call, see yt-dlp#14153).
    caption_path: Path | None = work_dir / f"{video_id}.en.srt"
    try:
        cap = subprocess.run(
            build_caption_args(url, out_template), capture_output=True, text=True, timeout=settings.youtube_download_timeout_seconds
        )
        if cap.returncode != 0:
            log.info("captions unavailable: %s", classify_ytdlp_output(cap.stderr).code.value)
    except subprocess.TimeoutExpired:
        log.info("captions timed out")
    if not caption_path.exists():
        caption_path = None
    return {"video_path": str(video_path), "caption_path": str(caption_path) if caption_path else None}
