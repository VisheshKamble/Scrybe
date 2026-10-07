"""Central error taxonomy.

Nothing outside this module should string-match yt-dlp / provider messages.
Every failure that can reach a user is a `ScrybeError` with a stable `code`,
a safe `user_message`, a `technical_message` (logs only, never returned with a
traceback) and a `retryable` flag the job system acts on.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum


class ErrorCode(str, Enum):
    # YouTube
    YOUTUBE_RATE_LIMITED = "YOUTUBE_RATE_LIMITED"
    YOUTUBE_BOT_CHECK = "YOUTUBE_BOT_CHECK"
    YOUTUBE_PRIVATE = "YOUTUBE_PRIVATE"
    YOUTUBE_DELETED = "YOUTUBE_DELETED"
    YOUTUBE_UNAVAILABLE = "YOUTUBE_UNAVAILABLE"
    YOUTUBE_GEO_RESTRICTED = "YOUTUBE_GEO_RESTRICTED"
    YOUTUBE_AGE_RESTRICTED = "YOUTUBE_AGE_RESTRICTED"
    YOUTUBE_EXTRACTOR_ERROR = "YOUTUBE_EXTRACTOR_ERROR"
    YOUTUBE_NETWORK_ERROR = "YOUTUBE_NETWORK_ERROR"
    INVALID_URL = "INVALID_URL"
    # AI
    AI_PROVIDER_ERROR = "AI_PROVIDER_ERROR"
    AI_TIMEOUT = "AI_TIMEOUT"
    AI_RATE_LIMITED = "AI_RATE_LIMITED"
    AI_GENERATION_ERROR = "AI_GENERATION_ERROR"
    # RAG
    RETRIEVAL_FAILED = "RETRIEVAL_FAILED"
    EMBEDDING_FAILED = "EMBEDDING_FAILED"
    INDEX_NOT_FOUND = "INDEX_NOT_FOUND"
    # Storage
    STORAGE_UPLOAD_FAILED = "STORAGE_UPLOAD_FAILED"
    STORAGE_DOWNLOAD_FAILED = "STORAGE_DOWNLOAD_FAILED"
    # Generic
    RATE_LIMITED = "RATE_LIMITED"
    JOB_NOT_FOUND = "JOB_NOT_FOUND"
    INTERNAL_ERROR = "INTERNAL_ERROR"


@dataclass(frozen=True)
class ErrorInfo:
    user_message: str
    retryable: bool
    http_status: int = 500


_CATALOG: dict[ErrorCode, ErrorInfo] = {
    ErrorCode.YOUTUBE_RATE_LIMITED: ErrorInfo(
        "YouTube temporarily limited requests from our processing server. Your job will retry automatically.", True, 503
    ),
    ErrorCode.YOUTUBE_BOT_CHECK: ErrorInfo(
        "YouTube asked our processing server to verify it isn't a bot. Your job will retry automatically.", True, 503
    ),
    ErrorCode.YOUTUBE_PRIVATE: ErrorInfo("This video is private and cannot be processed.", False, 422),
    ErrorCode.YOUTUBE_DELETED: ErrorInfo("This video has been removed.", False, 422),
    ErrorCode.YOUTUBE_UNAVAILABLE: ErrorInfo("This video is unavailable.", False, 422),
    ErrorCode.YOUTUBE_GEO_RESTRICTED: ErrorInfo("This video isn't available in the region our server runs in.", False, 422),
    ErrorCode.YOUTUBE_AGE_RESTRICTED: ErrorInfo(
        "This video is age-restricted and can't be processed without a signed-in account.", False, 422
    ),
    ErrorCode.YOUTUBE_EXTRACTOR_ERROR: ErrorInfo("We couldn't read this video from YouTube. We'll try again a few times.", True, 502),
    ErrorCode.YOUTUBE_NETWORK_ERROR: ErrorInfo("We hit a network problem reaching YouTube. We're retrying automatically.", True, 502),
    ErrorCode.INVALID_URL: ErrorInfo("That doesn't look like a YouTube video URL.", False, 400),
    ErrorCode.AI_PROVIDER_ERROR: ErrorInfo("The AI provider returned an error. Please try again.", True, 502),
    ErrorCode.AI_TIMEOUT: ErrorInfo("The AI provider took too long to respond. Please try again.", True, 504),
    ErrorCode.AI_RATE_LIMITED: ErrorInfo("The AI provider is rate limiting us. Please retry shortly.", True, 429),
    ErrorCode.AI_GENERATION_ERROR: ErrorInfo("The AI produced an unusable response. Please try again.", True, 502),
    ErrorCode.RETRIEVAL_FAILED: ErrorInfo("Searching this video failed. Please try again.", True, 500),
    ErrorCode.EMBEDDING_FAILED: ErrorInfo("We couldn't index this video's text.", True, 500),
    ErrorCode.INDEX_NOT_FOUND: ErrorInfo("This video hasn't been indexed yet -- has processing finished?", False, 404),
    ErrorCode.STORAGE_UPLOAD_FAILED: ErrorInfo("We couldn't save processed data. Retrying.", True, 500),
    ErrorCode.STORAGE_DOWNLOAD_FAILED: ErrorInfo("We couldn't load stored data. Retrying.", True, 500),
    ErrorCode.RATE_LIMITED: ErrorInfo("Too many requests. Please slow down and try again shortly.", True, 429),
    ErrorCode.JOB_NOT_FOUND: ErrorInfo("Unknown job.", False, 404),
    ErrorCode.INTERNAL_ERROR: ErrorInfo("We couldn't process this video.", False, 500),
}


class ScrybeError(Exception):
    def __init__(self, code: ErrorCode, technical_message: str = "", *, retryable: bool | None = None):
        info = _CATALOG[code]
        self.code = code
        self.user_message = info.user_message
        self.technical_message = technical_message or code.value
        self.retryable = info.retryable if retryable is None else retryable
        self.http_status = info.http_status
        super().__init__(f"{code.value}: {self.technical_message}")

    def to_dict(self) -> dict:
        """Safe, client-facing shape. technical_message is intentionally absent."""
        return {"code": self.code.value, "message": self.user_message, "retryable": self.retryable}


# --- yt-dlp output classification -----------------------------------------
# Ordered: first match wins. "age" must precede the generic bot-check because
# both start with "Sign in to confirm". The curly apostrophe is real: yt-dlp
# prints "you’re not a bot" with U+2019.
_APOS = "['\u2019]"
_YTDLP_RULES: list[tuple[re.Pattern, ErrorCode]] = [
    (re.compile(r"confirm your age|age[- ]restricted|inappropriate for some users", re.I), ErrorCode.YOUTUBE_AGE_RESTRICTED),
    (re.compile(rf"confirm you{_APOS}?re not a bot|not a bot", re.I), ErrorCode.YOUTUBE_BOT_CHECK),
    (re.compile(r"HTTP Error 429|Too Many Requests|rate[- ]limit", re.I), ErrorCode.YOUTUBE_RATE_LIMITED),
    (re.compile(r"private video|video is private", re.I), ErrorCode.YOUTUBE_PRIVATE),
    (
        re.compile(
            r"has been removed|account associated with this video has been terminated|video was deleted|removed by the uploader|copyright claim",
            re.I,
        ),
        ErrorCode.YOUTUBE_DELETED,
    ),
    (
        re.compile(
            r"not available in your country|blocked it in your country|geo[- ]?restrict|not made this video available in your country", re.I
        ),
        ErrorCode.YOUTUBE_GEO_RESTRICTED,
    ),
    (
        re.compile(
            r"video unavailable|this video is unavailable|video is not available|live event will begin|members-only|join this channel", re.I
        ),
        ErrorCode.YOUTUBE_UNAVAILABLE,
    ),
    (
        re.compile(
            r"timed? ?out|temporary failure in name resolution|connection (reset|refused|aborted)|network is unreachable|remote end closed|Unable to download (webpage|API)|Read timed out|SSL",
            re.I,
        ),
        ErrorCode.YOUTUBE_NETWORK_ERROR,
    ),
]


def classify_ytdlp_output(text: str) -> ScrybeError:
    """Map yt-dlp stderr / exception text to a ScrybeError. Unknown -> extractor error."""
    snippet = (text or "").strip()[-1500:]
    for pattern, code in _YTDLP_RULES:
        if pattern.search(snippet):
            return ScrybeError(code, snippet)
    return ScrybeError(ErrorCode.YOUTUBE_EXTRACTOR_ERROR, snippet or "yt-dlp failed with no output")


# Codes that mean "YouTube is throttling *our IP*", which warrants a
# cluster-wide cooldown rather than per-job retries alone.
IP_LEVEL_BLOCK_CODES = {ErrorCode.YOUTUBE_RATE_LIMITED, ErrorCode.YOUTUBE_BOT_CHECK}


def classify_exception(exc: BaseException) -> ScrybeError:
    """Last-resort mapping so no raw traceback ever becomes a user message."""
    if isinstance(exc, ScrybeError):
        return exc
    return ScrybeError(ErrorCode.INTERNAL_ERROR, f"{type(exc).__name__}: {exc}")
