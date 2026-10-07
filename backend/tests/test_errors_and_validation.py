import pytest

from app.errors import ErrorCode, ScrybeError, classify_ytdlp_output
from app.validation import canonical_youtube_url, extract_youtube_id, is_valid_job_id, is_valid_video_id, video_id_for_youtube


@pytest.mark.parametrize(
    "text,code",
    [
        ("ERROR: unable to download video data: HTTP Error 429: Too Many Requests", ErrorCode.YOUTUBE_RATE_LIMITED),
        ("ERROR: [youtube] abc: Sign in to confirm you\u2019re not a bot. Use --cookies-from-browser", ErrorCode.YOUTUBE_BOT_CHECK),
        ("ERROR: [youtube] abc: Sign in to confirm you're not a bot", ErrorCode.YOUTUBE_BOT_CHECK),
        ("ERROR: [youtube] abc: Sign in to confirm your age. This video may be inappropriate", ErrorCode.YOUTUBE_AGE_RESTRICTED),
        ("ERROR: [youtube] abc: Private video. Sign in if you've been granted access", ErrorCode.YOUTUBE_PRIVATE),
        ("ERROR: [youtube] abc: Video unavailable", ErrorCode.YOUTUBE_UNAVAILABLE),
        ("ERROR: This video has been removed by the uploader", ErrorCode.YOUTUBE_DELETED),
        ("ERROR: The uploader has not made this video available in your country", ErrorCode.YOUTUBE_GEO_RESTRICTED),
        ("ERROR: Unable to download webpage: <urlopen error Temporary failure in name resolution>", ErrorCode.YOUTUBE_NETWORK_ERROR),
        ("ERROR: something nobody has seen before", ErrorCode.YOUTUBE_EXTRACTOR_ERROR),
        ("", ErrorCode.YOUTUBE_EXTRACTOR_ERROR),
    ],
)
def test_ytdlp_classification(text, code):
    assert classify_ytdlp_output(text).code == code


def test_retryability_matches_catalog():
    assert classify_ytdlp_output("HTTP Error 429").retryable
    assert not classify_ytdlp_output("Private video").retryable
    assert not classify_ytdlp_output("Sign in to confirm your age").retryable


def test_client_payload_never_contains_technical_message():
    err = ScrybeError(ErrorCode.INTERNAL_ERROR, "Traceback (most recent call last): secret=abc")
    assert "Traceback" not in str(err.to_dict()) and "secret" not in str(err.to_dict())


@pytest.mark.parametrize(
    "url",
    [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&t=5",
        "https://youtu.be/dQw4w9WgXcQ?si=abc",
        "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://www.youtube.com/shorts/dQw4w9WgXcQ",
        "https://www.youtube.com/live/dQw4w9WgXcQ",
        "http://music.youtube.com/watch?v=dQw4w9WgXcQ",
    ],
)
def test_valid_urls(url):
    assert extract_youtube_id(url) == "dQw4w9WgXcQ"
    assert canonical_youtube_url(url) == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


@pytest.mark.parametrize(
    "url",
    [
        "",
        None,
        "-o /etc/passwd",
        "--exec rm",
        "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
        "https://evil.com/watch?v=dQw4w9WgXcQ",
        "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
        "https://www.youtube.com@evil.com/watch?v=dQw4w9WgXcQ",
        "https://user:pw@www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://www.youtube.com:8080/watch?v=dQw4w9WgXcQ",
        "http://169.254.169.254/latest/meta-data",
        "http://localhost/watch?v=dQw4w9WgXcQ",
        "https://www.youtube.com/watch?v=short",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ; rm -rf /",
        "https://www.youtube.com/playlist?list=PL123",
        "https://www.youtube.com/watch?v=" + "a" * 3000,
    ],
)
def test_rejected_urls(url):
    assert extract_youtube_id(url) is None


def test_ids():
    vid = video_id_for_youtube("dQw4w9WgXcQ")
    assert is_valid_video_id(vid) and vid == video_id_for_youtube("dQw4w9WgXcQ")
    assert not is_valid_video_id("../etc/pa") and not is_valid_video_id("ABCDEF12")
    assert is_valid_job_id("a" * 32) and not is_valid_job_id("a/../b")
