"""Shared input validation used across routes and ingestion.

Two things get validated here, both for the same underlying reason: every
value in these checks eventually reaches either a filesystem path or a
subprocess argument list, so a value that doesn't look like what we expect
is rejected before it gets anywhere near `Path(...)` or `subprocess.run(...)`,
rather than trusted and found out about later.
"""
import re

# app/ingestion/youtube.py mints video_id as str(uuid.uuid4())[:8] -- the
# first 8 characters of a uuid4's hex representation, before the first
# dash. That's always exactly 8 lowercase hex characters. Every route that
# takes a video_id in the URL uses it to build a filesystem path
# (REPORT_DIR / f"{video_id}.json" and friends) -- this pattern is the
# gate that keeps a malformed or hostile path segment from ever reaching
# those Path(...) calls.
VIDEO_ID_PATTERN = re.compile(r"^[0-9a-f]{8}$")


def is_valid_video_id(video_id: str) -> bool:
    return bool(VIDEO_ID_PATTERN.match(video_id))


# Deliberately narrower than the frontend's HOST_MATCHERS (frontend/src/lib/youtube.js)
# in one respect: this only needs to confirm "this is a youtube.com/youtu.be
# URL", not extract the video ID for display. yt-dlp itself handles the
# full range of valid YouTube URL shapes (watch, shorts, live, playlists
# disabled via --no-playlist, etc.) -- this check exists purely so a
# non-YouTube string, or a string crafted to look like a yt-dlp CLI flag
# (e.g. one starting with "-"), never reaches the subprocess call in
# app/ingestion/youtube.py at all.
_YOUTUBE_HOST_PATTERN = re.compile(
    r"^https?://(www\.|m\.|music\.)?(youtube\.com|youtu\.be)/\S+$",
    re.IGNORECASE,
)


def is_valid_youtube_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    # Reject anything that could be interpreted as a CLI flag by yt-dlp/ffmpeg
    # downstream, on top of (not instead of) the "--" separator already used
    # before the URL argument in app/ingestion/youtube.py.
    if url.startswith("-"):
        return False
    return bool(_YOUTUBE_HOST_PATTERN.match(url))
