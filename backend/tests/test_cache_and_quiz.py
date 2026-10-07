import json

import pytest
from fastapi.testclient import TestClient

from app.ask.graph import run_ask
from app.ask.models import AskRequest
from app.config import settings
from app.main import app
from app.report_store import save_report
from app.vectorstore.chunking import build_chunks
from app.vectorstore.index import VideoIndex
from tests.fixtures import CHAPTERS, segments
from tests.test_ask import citing_all

V = "aaaaaaa1"
ANSWER = "Cache invalidation means the cached copy goes stale and you expire it with a time to live."


@pytest.fixture
def indexed():
    VideoIndex(V).build(build_chunks(V, segments(), None, CHAPTERS))
    save_report(V, {"video_id": V, "summary": "s", "chapters": CHAPTERS, "claims": []})


def ask(q="What is cache invalidation?", **kw):
    return run_ask(AskRequest(video_ids=[V], question=q, **kw), "r")


def test_second_identical_ask_is_served_from_cache_with_zero_llm_calls(indexed, fake_llm):
    llm = fake_llm(citing_all(ANSWER))
    first = ask()
    second = ask("  what is CACHE invalidation? ")  # normalized
    assert not first.cached and second.cached and len(llm.calls) == 1
    assert second.usage["llm_calls"] == 0 and second.answer == first.answer and second.citations == first.citations


def test_cache_key_distinguishes_mode_level_and_length(indexed, fake_llm):
    llm = fake_llm(citing_all(ANSWER), citing_all(ANSWER), citing_all(ANSWER))
    ask()
    ask(level="beginner")
    ask(length="detailed")
    assert len(llm.calls) == 3


def test_fallbacks_are_never_cached(indexed, fake_llm):
    llm = fake_llm(json.dumps({"answerable": False}), citing_all(ANSWER))
    assert ask().confidence == "none"
    again = ask()
    assert not again.cached and again.confidence != "none" and len(llm.calls) == 2


def test_rebuilding_the_index_invalidates_cached_answers(indexed, fake_llm):
    llm = fake_llm(citing_all(ANSWER), citing_all(ANSWER))
    ask()
    VideoIndex(V).build(build_chunks(V, segments(), None, CHAPTERS))
    assert not ask().cached and len(llm.calls) == 2


def test_cache_can_be_disabled(indexed, fake_llm, monkeypatch):
    monkeypatch.setattr(settings, "answer_cache_ttl_seconds", 0)
    llm = fake_llm(citing_all(ANSWER), citing_all(ANSWER))
    ask()
    ask()
    assert len(llm.calls) == 2


def test_redis_failure_degrades_to_no_cache(indexed, fake_llm, monkeypatch):
    from app.ask import cache

    class Broken:
        def get(self, *a, **k):
            raise ConnectionError("down")

        set = get

    fake_llm(citing_all(ANSWER))
    monkeypatch.setattr(cache.redis_client, "get_redis", lambda: Broken())
    assert ask().grounded  # still answers


def test_quiz_results_aggregate_and_hold_no_content():
    c = TestClient(app)
    for correct, diff in [(True, "easy"), (False, "hard"), (True, "hard")]:
        r = c.post("/api/quiz/results", json={"video_id": V, "correct": correct, "difficulty": diff})
        assert r.status_code == 200
    s = c.get(f"/api/quiz/stats/{V}").json()
    assert s["total"] == 3 and s["correct"] == 2 and s["accuracy"] == 0.667
    assert s["by_difficulty"]["hard"] == {"total": 2, "correct": 1}


def test_quiz_stats_are_per_client_and_validated():
    c = TestClient(app)
    c.post("/api/quiz/results", json={"video_id": V, "correct": True})
    assert c.get(f"/api/quiz/stats/{V}", headers={"x-forwarded-for": "8.8.8.8"}).json()["total"] == 0
    assert c.post("/api/quiz/results", json={"video_id": "../x", "correct": True}).status_code == 404
    assert c.post("/api/quiz/results", json={"video_id": V, "correct": True, "difficulty": "brutal"}).status_code == 422
    assert c.get("/api/quiz/stats/not-an-id").status_code == 404
