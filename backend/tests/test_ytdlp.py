import subprocess
from types import SimpleNamespace

import pytest

from app.config import settings
from app.errors import ErrorCode, ScrybeError
from app.ingestion import youtube

URL = "https://youtu.be/dQw4w9WgXcQ?list=PLx"
CANON = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


def test_args_use_canonical_url_after_double_dash_and_no_playlist():
    args = youtube.build_video_args(CANON, "/tmp/x.%(ext)s")
    assert args[-2:] == ["--", CANON] and "--no-playlist" in args
    assert "--js-runtimes" in args and "ejs:github" in args


def test_retries_are_bounded_and_unsafe_flags_absent():
    joined = " ".join(youtube.build_video_args(CANON, "/tmp/x"))
    for bad in ("infinite", "--no-check-certificate", "--user-agent", "--legacy-server-connect"):
        assert bad not in joined
    assert "--retries 2" in joined


def test_cookies_proxy_and_pot_provider_are_opt_in(monkeypatch):
    base = " ".join(youtube.build_video_args(CANON, "/tmp/x"))
    assert "--cookies" not in base and "--proxy" not in base and "bgutil" not in base
    monkeypatch.setattr(settings, "bgutil_base_url", "http://bgutil:4416")
    monkeypatch.setattr(settings, "ytdlp_proxy", "http://egress:3128")
    on = " ".join(youtube.build_video_args(CANON, "/tmp/x"))
    assert "youtubepot-bgutilhttp:base_url=http://bgutil:4416" in on and "--proxy http://egress:3128" in on


def _run_factory(video_rc=0, stderr="", make_video=True, make_caption=True):
    def run(args, **kw):
        out = args[args.index("-o") + 1]
        if "--skip-download" in args:
            if make_caption:
                open(out.replace("%(ext)s", "en.srt"), "w").write("x")
            return SimpleNamespace(returncode=0, stderr="", stdout="")
        if video_rc == 0 and make_video:
            open(out.replace("%(ext)s", "mp4"), "w").write("v")
        return SimpleNamespace(returncode=video_rc, stderr=stderr, stdout="")

    return run


def test_download_success(monkeypatch, tmp_path):
    monkeypatch.setattr(subprocess, "run", _run_factory())
    r = youtube.download_video(URL, "abcd1234", tmp_path)
    assert r["video_path"].endswith("abcd1234.mp4") and r["caption_path"].endswith(".en.srt")


def test_download_without_captions_is_ok(monkeypatch, tmp_path):
    monkeypatch.setattr(subprocess, "run", _run_factory(make_caption=False))
    assert youtube.download_video(URL, "abcd1234", tmp_path)["caption_path"] is None


@pytest.mark.parametrize(
    "stderr,code",
    [
        ("HTTP Error 429: Too Many Requests", ErrorCode.YOUTUBE_RATE_LIMITED),
        ("Sign in to confirm you\u2019re not a bot", ErrorCode.YOUTUBE_BOT_CHECK),
        ("Private video", ErrorCode.YOUTUBE_PRIVATE),
    ],
)
def test_download_failure_is_classified(monkeypatch, tmp_path, stderr, code):
    monkeypatch.setattr(subprocess, "run", _run_factory(video_rc=1, stderr=stderr))
    with pytest.raises(ScrybeError) as e:
        youtube.download_video(URL, "abcd1234", tmp_path)
    assert e.value.code == code


def test_timeout_is_network_error(monkeypatch, tmp_path):
    def boom(*a, **k):
        raise subprocess.TimeoutExpired("yt-dlp", 1)

    monkeypatch.setattr(subprocess, "run", boom)
    with pytest.raises(ScrybeError) as e:
        youtube.download_video(URL, "abcd1234", tmp_path)
    assert e.value.code == ErrorCode.YOUTUBE_NETWORK_ERROR


def test_non_youtube_url_never_reaches_subprocess(monkeypatch, tmp_path):
    called = []
    monkeypatch.setattr(subprocess, "run", lambda *a, **k: called.append(1))
    with pytest.raises(ScrybeError) as e:
        youtube.download_video("https://evil.example/x", "abcd1234", tmp_path)
    assert e.value.code == ErrorCode.INVALID_URL and not called
