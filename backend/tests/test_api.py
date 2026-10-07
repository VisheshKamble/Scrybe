import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.jobs import JobStatus, JobStore
from app.main import app
from app.report_store import save_report

URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


@pytest.fixture
def client(monkeypatch):
    calls = []
    import app.tasks.ingest as ingest

    monkeypatch.setattr(ingest.ingest_youtube_task, "apply_async", lambda **kw: calls.append(kw))
    c = TestClient(app)
    c.dispatched = calls
    return c


def test_health_does_not_depend_on_anything(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_ready_reports_checks(client):
    r = client.get("/ready")
    assert r.status_code == 200 and r.json()["checks"] == {"redis": "ok", "storage": "ok"}


def test_create_job_returns_quickly_and_dispatches_to_ingestion_queue(client):
    r = client.post("/api/videos", json={"youtube_url": URL})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "queued" and len(body["job_id"]) == 32
    assert client.dispatched[0]["queue"] == "youtube_ingestion"
    assert client.dispatched[0]["args"] == [body["job_id"]]


def test_duplicate_submission_is_idempotent(client):
    a = client.post("/api/videos", json={"youtube_url": URL}).json()
    b = client.post("/api/videos", json={"youtube_url": URL + "&list=PLxyz&t=3"}).json()
    assert a["job_id"] == b["job_id"] and len(client.dispatched) == 1


def test_failed_job_can_be_resubmitted(client):
    a = client.post("/api/videos", json={"youtube_url": URL}).json()
    JobStore().update(a["job_id"], status=JobStatus.FAILED)
    b = client.post("/api/videos", json={"youtube_url": URL}).json()
    assert a["job_id"] != b["job_id"] and len(client.dispatched) == 2


def test_already_processed_video_completes_immediately(client):
    from app.validation import video_id_for_youtube

    save_report(video_id_for_youtube("dQw4w9WgXcQ"), {"video_id": "x", "summary": "s", "chapters": [], "claims": []})
    r = client.post("/api/videos", json={"youtube_url": URL}).json()
    assert r["status"] == "completed" and r["progress"] == 100 and not client.dispatched


def test_invalid_url_is_structured_400(client):
    r = client.post("/api/videos", json={"youtube_url": "https://evil.com/x"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "INVALID_URL"
    assert isinstance(r.json()["detail"], str)
    assert not client.dispatched


def test_status_endpoints_and_unknown_job(client):
    job = client.post("/api/videos", json={"youtube_url": URL}).json()
    for path in (f"/api/videos/{job['job_id']}", f"/api/videos/{job['job_id']}/status"):
        body = client.get(path).json()
        assert {"job_id", "status", "stage", "progress", "error_code", "error_message"} <= set(body)
    assert client.get("/api/videos/" + "0" * 32).status_code == 404
    assert client.get("/api/videos/not-a-job").status_code == 404


def test_status_never_leaks_client_id_or_source(client):
    job = client.post("/api/videos", json={"youtube_url": URL}).json()
    text = client.get(f"/api/videos/{job['job_id']}").text
    assert "client_id" not in text and "source_url" not in text


def test_active_job_limit(client, monkeypatch):
    monkeypatch.setattr(settings, "max_active_jobs_per_user", 2)
    ids = ["dQw4w9WgXcQ", "aaaaaaaaaaa", "bbbbbbbbbbb"]
    codes = [client.post("/api/videos", json={"youtube_url": f"https://youtu.be/{i}"}).status_code for i in ids]
    assert codes == [200, 200, 429]


def test_daily_submission_quota(client, monkeypatch):
    monkeypatch.setattr(settings, "max_video_jobs_per_user", 1)
    monkeypatch.setattr(settings, "max_active_jobs_per_user", 99)
    assert client.post("/api/videos", json={"youtube_url": "https://youtu.be/aaaaaaaaaaa"}).status_code == 200
    r = client.post("/api/videos", json={"youtube_url": "https://youtu.be/bbbbbbbbbbb"})
    assert r.status_code == 429 and r.json()["error"]["code"] == "RATE_LIMITED" and "retry-after" in r.headers


def test_api_rate_limit_is_per_client_and_in_redis(client, monkeypatch):
    monkeypatch.setattr(settings, "api_rate_limit", 3)
    codes = [client.get("/api/videos/" + "0" * 32).status_code for _ in range(5)]
    assert codes == [404, 404, 404, 429, 429]
    other = client.get("/api/videos/" + "0" * 32, headers={"x-forwarded-for": "9.9.9.9"})
    assert other.status_code == 404  # different client, own bucket


def test_unhandled_error_hides_traceback(monkeypatch):
    import app.routes.videos as v

    monkeypatch.setattr(v, "submit_video", lambda *a, **k: 1 / 0)
    r = TestClient(app, raise_server_exceptions=False).post("/api/videos", json={"youtube_url": URL})
    assert r.status_code == 500 and "ZeroDivision" not in r.text and "Traceback" not in r.text


def test_report_endpoint_validates_ids(client):
    assert client.get("/api/videos/..%2f..%2fetc/report").status_code in (404, 422)
    assert client.get("/api/videos/deadbeef/report").status_code == 404
