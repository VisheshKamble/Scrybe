import os

import pytest

from app.config import settings
from app.errors import ErrorCode, ScrybeError
from app.jobs import JobStatus, JobStore
from app.report_store import load_report, report_exists
from app.storage import get_storage
from app.tasks import process_video as pv
from app.vectorstore.index import VideoIndex

VID = "abcd1234"


@pytest.fixture
def job():
    j = JobStore().create(kind="video", source_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ", video_id=VID, client_id="c")
    get_storage().upload(f"videos/{VID}.mp4", b"video")
    get_storage().upload(f"videos/{VID}.en.srt", "cap")
    return j


class FakeGraph:
    def __init__(self, fail=None):
        self.fail = fail

    def stream(self, state, stream_mode):
        segs = [
            {"start": 0.0, "end": 20.0, "text": "Redis is an in-memory data store used for caching."},
            {"start": 20.0, "end": 45.0, "text": "Cache invalidation removes stale entries from the cache."},
        ]
        state = {**state, "transcript_segments": segs, "visual_descriptions": []}
        yield {"transcript_agent": state}
        if self.fail:
            raise self.fail
        state = {**state, "chapters": [{"title": "Intro", "start_seconds": 0, "end_seconds": 45, "summary": "s"}]}
        yield {"segmentation_agent": state}
        yield {"synthesis_agent": {**state, "summary": "sum", "claims": []}}


def _patch(monkeypatch, graph):
    monkeypatch.setattr(pv, "video_graph", graph)
    monkeypatch.setattr(pv, "extract_keyframes", lambda *a, **k: [])
    monkeypatch.setattr(pv, "extract_audio", lambda *a, **k: None)


def _workdirs():
    return os.listdir(settings.work_dir) if os.path.exists(settings.work_dir) else []


def test_pipeline_success_indexes_reports_and_cleans_up(monkeypatch, job):
    _patch(monkeypatch, FakeGraph())
    pv.process_video_task(job["job_id"])
    j = JobStore().get(job["job_id"])
    assert j["status"] == JobStatus.COMPLETED.value and j["progress"] == 100
    assert report_exists(VID) and load_report(VID)["summary"] == "sum"
    assert VideoIndex(VID).search("what is cache invalidation", k=2)[0]["chunk_id"].startswith(VID)
    assert not get_storage().exists(f"videos/{VID}.mp4")  # source video removed after success
    assert _workdirs() == []


def test_source_video_retained_when_configured(monkeypatch, job):
    monkeypatch.setattr(settings, "retain_source_video", True)
    _patch(monkeypatch, FakeGraph())
    pv.process_video_task(job["job_id"])
    assert get_storage().exists(f"videos/{VID}.mp4")


def test_failure_cleans_temp_and_marks_failed_without_leaking(monkeypatch, job):
    _patch(monkeypatch, FakeGraph(fail=RuntimeError("boom /secret/path")))
    pv.process_video_task(job["job_id"])
    j = JobStore().get(job["job_id"])
    assert j["status"] == "failed" and "secret" not in j["error_message"]
    assert _workdirs() == []
    assert get_storage().exists(f"videos/{VID}.mp4")  # kept so a resubmit needn't re-download


def test_retryable_provider_error_retries_then_fails(monkeypatch, job):
    from celery.exceptions import Retry

    _patch(monkeypatch, FakeGraph(fail=ScrybeError(ErrorCode.AI_RATE_LIMITED, "429")))
    for _ in range(pv.MAX_PROCESS_RETRIES):
        with pytest.raises(Retry):
            pv.process_video_task(job["job_id"])
        assert JobStore().get(job["job_id"])["status"] == "retrying"
    pv.process_video_task(job["job_id"])
    assert JobStore().get(job["job_id"])["status"] == "failed"


def test_duplicate_concurrent_execution_is_blocked(monkeypatch, job, env):
    from celery.exceptions import Retry

    env.set(f"lock:process:{VID}", "other-worker")
    _patch(monkeypatch, FakeGraph())
    with pytest.raises(Retry):
        pv.process_video_task(job["job_id"])
    assert not report_exists(VID)


def test_already_completed_video_is_noop(monkeypatch, job):
    from app.report_store import save_report

    save_report(VID, {"video_id": VID, "summary": "x", "chapters": [], "claims": []})
    _patch(monkeypatch, FakeGraph(fail=RuntimeError("must not run")))
    pv.process_video_task(job["job_id"])
    assert JobStore().get(job["job_id"])["status"] == "completed"


def test_chunking_merges_and_dedupes_rolling_captions():
    from app.vectorstore.chunking import build_chunks

    segs = [
        {"start": 0, "end": 2, "text": "hello world"},
        {"start": 2, "end": 4, "text": "hello world"},
        {"start": 4, "end": 6, "text": "hello world again"},
        {"start": 50, "end": 55, "text": "second window"},
    ]
    chunks = build_chunks(
        "abcd1234",
        segs,
        [{"timestamp_seconds": 3.0, "description": "a slide"}],
        [{"title": "Intro", "start_seconds": 0, "end_seconds": 100, "summary": ""}],
    )
    t = [c for c in chunks if c["source"] == "transcript"]
    assert "hello world again" in t[0]["text"] and t[0]["text"].count("hello world") == 1
    assert all({"chunk_id", "video_id", "start_time", "end_time", "chapter", "text"} <= set(c) for c in chunks)
    assert chunks[-1]["source"] == "visual" and t[0]["chapter"] == "Intro"
