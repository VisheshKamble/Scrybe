"""Input validation shared by routes and ingestion.

URLs are *parsed*, not just regex-matched: the host must be exactly one of a
small allowlist, userinfo/ports are rejected, and we extract the 11-char
YouTube id and rebuild a canonical URL. Only that rebuilt URL is ever handed
to yt-dlp, so playlist params, redirects-by-query, and flag-lookalike strings
never reach the subprocess. This is also the SSRF boundary: a non-YouTube
host cannot be fetched.
"""

from __future__ import annotations

import hashlib
import re
from urllib.parse import parse_qs, urlparse

# 8 lowercase hex chars. Used in storage keys / file names, so strictly gated.
VIDEO_ID_PATTERN = re.compile(r"^[0-9a-f]{8}$")
JOB_ID_PATTERN = re.compile(r"^[0-9a-f]{32}$")
_YT_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")

_ALLOWED_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be"}
_PATH_PREFIXES = ("shorts", "live", "embed", "v")


def is_valid_video_id(video_id: str) -> bool:
    return bool(isinstance(video_id, str) and VIDEO_ID_PATTERN.match(video_id))


def is_valid_job_id(job_id: str) -> bool:
    return bool(isinstance(job_id, str) and JOB_ID_PATTERN.match(job_id))


def extract_youtube_id(url: str) -> str | None:
    if not url or not isinstance(url, str):
        return None
    url = url.strip()
    if url.startswith("-") or len(url) > 2048 or any(c.isspace() for c in url):
        return None
    try:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        port = parsed.port
    except ValueError:
        return None
    if parsed.scheme not in ("http", "https") or host not in _ALLOWED_HOSTS:
        return None
    if parsed.username or parsed.password or port not in (None, 80, 443):
        return None
    segments = [s for s in parsed.path.split("/") if s]
    candidate = None
    if host.endswith("youtu.be"):
        candidate = segments[0] if segments else None
    elif segments and segments[0] == "watch":
        candidate = (parse_qs(parsed.query).get("v") or [None])[0]
    elif len(segments) >= 2 and segments[0] in _PATH_PREFIXES:
        candidate = segments[1]
    return candidate if candidate and _YT_ID.match(candidate) else None


def is_valid_youtube_url(url: str) -> bool:
    return extract_youtube_id(url) is not None


def canonical_youtube_url(url: str) -> str:
    yid = extract_youtube_id(url)
    if not yid:
        raise ValueError("not a YouTube video URL")
    return f"https://www.youtube.com/watch?v={yid}"


def video_id_for_youtube(youtube_id: str) -> str:
    """Deterministic Scrybe video_id: the same YouTube video always maps to the
    same id, which makes submissions idempotent and lets an existing index be
    reused. 32 bits is plenty for a single-tenant instance; widen the pattern
    (and this function) before running at very large scale."""
    return hashlib.sha256(f"youtube:{youtube_id}".encode()).hexdigest()[:8]
