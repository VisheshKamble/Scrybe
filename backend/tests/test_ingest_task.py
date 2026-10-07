import os

import pytest
from celery.exceptions import Retry

from app.config import settings
from app.errors import ErrorCode, ScrybeError
from app.ingestion import gate
from app.jobs import JobStatus, JobStore
from app.storage import get_storage
from app.tasks import ingest

VID = "abcd1234"


@pytest.fixture
def job(monkeypatch):
    j = JobStore().create(kind="video", source_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ", video_id=VID, client_id="c")
    dispatched = []
    monkeypatch.setattr(ingest, "_dispatch_processing", lambda jid: dispatched.append(jid))
    j["dispatched"] = dispatched
    return j


def _fake_download(monkeypatch, *, error=None, calls=None):
    def fake(url, video_id, work):
        if calls is not None:
            calls.append(url)
        work.mkdir(parents=True, exist_ok=True)
        if error:
            raise error
        (work / f"{video_id}.mp4").write_bytes(b"video")
        (work / f"{video_id}.en.srt").write_text("cap")
        return {"video_path": str(work / f"{video_id}.mp4"), "caption_path": str(work / f"{video_id}.en.srt")}

    monkeypatch.setattr(ingest, "download_video", fake)


def test_success_uploads_dispatches_and_cleans_temp(monkeypatch, job):
    _fake_download(monkeypatch)
    ingest.ingest_youtube_task(job["job_id"])
    st = get_storage()
    assert st.exists(f"videos/{VID}.mp4") and st.exists(f"videos/{VID}.en.srt")
    assert JobStore().get(job["job_id"])["status"] == JobStatus.DOWNLOADED.value
    assert job["dispatched"] == [job["job_id"]]
    assert not [d for d in os.listdir(settings.work_dir) if d.startswith("ingest_")] if os.path.exists(settings.work_dir) else True
    assert gate.try_acquire().acquired  # slot was released


def test_rate_limit_retries_with_cooldown_then_gives_up(monkeypatch, job):
    monkeypatch.setattr(settings, "youtube_max_retries", 2)
    _fake_download(monkeypatch, error=ScrybeError(ErrorCode.YOUTUBE_RATE_LIMITED, "429"))
    store = JobStore()
    for attempt in (1, 2):
        with pytest.raises(Retry):
            ingest.ingest_youtube_task(job["job_id"])
        j = store.get(job["job_id"])
        assert j["status"] == JobStatus.RATE_LIMITED.value and j["retry_count"] == attempt
        assert j["error_code"] == "YOUTUBE_RATE_LIMITED" and "retry automatically" in j["error_message"]
        assert gate.cooldown_remaining() > 0
        from app import redis_client

        redis_client.get_redis().delete("youtube:cooldown")  # simulate cooldown passing
    ingest.ingest_youtube_task(job["job_id"])  # budget exhausted -> permanent failure, no more retries
    j = store.get(job["job_id"])
    assert j["status"] == JobStatus.FAILED.value and j["error_code"] == "YOUTUBE_RATE_LIMITED"
    assert not job["dispatched"]


def test_permanent_errors_do_not_retry(monkeypatch, job):
    _fake_download(monkeypatch, error=ScrybeError(ErrorCode.YOUTUBE_PRIVATE, "private"))
    ingest.ingest_youtube_task(job["job_id"])
    j = JobStore().get(job["job_id"])
    assert j["status"] == "failed" and j["error_code"] == "YOUTUBE_PRIVATE" and j["retry_count"] == 0
    assert j["error_message"] == "This video is private and cannot be processed."


def test_unknown_exception_becomes_safe_internal_error(monkeypatch, job):
    _fake_download(monkeypatch, error=RuntimeError("secret /etc/passwd traceback"))
    ingest.ingest_youtube_task(job["job_id"])
    j = JobStore().get(job["job_id"])
    assert j["status"] == "failed" and "passwd" not in j["error_message"]


def test_failed_download_still_cleans_temp_dir_and_releases_slot(monkeypatch, job):
    _fake_download(monkeypatch, error=ScrybeError(ErrorCode.YOUTUBE_UNAVAILABLE))
    ingest.ingest_youtube_task(job["job_id"])
    leftovers = [d for d in os.listdir(settings.work_dir)] if os.path.exists(settings.work_dir) else []
    assert leftovers == [] and gate.try_acquire().acquired


def test_cooldown_blocks_without_touching_youtube(monkeypatch, job):
    calls = []
    _fake_download(monkeypatch, calls=calls)
    gate.trip_cooldown(120)
    with pytest.raises(Retry):
        ingest.ingest_youtube_task(job["job_id"])
    assert calls == [] and JobStore().get(job["job_id"])["status"] == "rate_limited"
    assert JobStore().get(job["job_id"])["retry_count"] == 0  # waiting is free


def test_concurrency_cap_is_cluster_wide(monkeypatch):
    monkeypatch.setattr(settings, "youtube_max_concurrent_downloads", 2)
    a, b, c = gate.try_acquire(), gate.try_acquire(), gate.try_acquire()
    assert a.acquired and b.acquired and not c.acquired and c.reason == "concurrency"
    gate.release(a.token)
    assert gate.try_acquire().acquired


def test_min_request_delay_spaces_requests(monkeypatch):
    monkeypatch.setattr(settings, "youtube_min_request_delay", 5.0)
    monkeypatch.setattr(settings, "youtube_max_concurrent_downloads", 5)
    first = gate.try_acquire()
    second = gate.try_acquire()
    assert first.acquired and not second.acquired and second.reason == "spacing" and second.wait_seconds >= 1


def test_redelivered_task_for_finished_job_is_noop(monkeypatch, job):
    calls = []
    _fake_download(monkeypatch, calls=calls)
    JobStore().mark_completed(job["job_id"])
    ingest.ingest_youtube_task(job["job_id"])
    assert calls == [] and not job["dispatched"]


def test_retry_after_partial_success_skips_download(monkeypatch, job):
    calls = []
    _fake_download(monkeypatch, calls=calls)
    get_storage().upload(f"videos/{VID}.mp4", b"already here")
    ingest.ingest_youtube_task(job["job_id"])
    assert calls == [] and job["dispatched"] == [job["job_id"]]


def test_backoff_is_exponential_capped_and_jittered():
    import random

    from app.retry import backoff_with_jitter

    rng = random.Random(1)
    vals = [backoff_with_jitter(n, 30, 900, rng) for n in range(8)]
    assert all(1 <= v <= 900 * 1.5 for v in vals)
    assert len({backoff_with_jitter(2, 30, 900, random.Random(s)) for s in range(10)}) > 1  # jitter
    assert max(backoff_with_jitter(10, 30, 900, random.Random(s)) for s in range(20)) <= 1350  # cap*1.5
