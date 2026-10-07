import os
import tempfile

_TMP = tempfile.mkdtemp(prefix="scrybe_test_")
os.environ.update(
    {
        "GROQ_API_KEY": "test-key",
        "EMBEDDING_PROVIDER": "hash",
        "STORAGE_LOCAL_PATH": f"{_TMP}/storage",
        "VECTOR_STORE_PATH": f"{_TMP}/vs",
        "WORK_DIR": f"{_TMP}/work",
        "REDIS_URL": "redis://localhost:6379/15",
    }
)

import fakeredis  # noqa: E402
import pytest  # noqa: E402

from app import redis_client  # noqa: E402
from app.config import settings  # noqa: E402
from app.llm import LLMProvider, LLMResult, set_llm  # noqa: E402
from app.storage import reset_storage_cache  # noqa: E402
from app.vectorstore.embeddings import HashEmbedder, set_embedder  # noqa: E402


@pytest.fixture(autouse=True)
def env(monkeypatch, tmp_path):
    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(redis_client, "get_redis", lambda: fake)
    monkeypatch.setattr(settings, "storage_backend", "local")
    monkeypatch.setattr(settings, "storage_local_path", str(tmp_path / "storage"))
    monkeypatch.setattr(settings, "vector_store_path", str(tmp_path / "vs"))
    monkeypatch.setattr(settings, "work_dir", str(tmp_path / "work"))
    monkeypatch.setattr(settings, "youtube_min_request_delay", 0.0)
    # 0.25 default is calibrated for MiniLM; the lexical test embedder has a lower scale.
    monkeypatch.setattr(settings, "retrieval_min_score", 0.12)
    reset_storage_cache()
    set_embedder(HashEmbedder())
    yield fake
    set_llm(None)
    set_embedder(None)
    reset_storage_cache()


class FakeLLM(LLMProvider):
    """Returns scripted outputs in order; records every call for assertions."""

    def __init__(self, *outputs):
        self.outputs = list(outputs)
        self.calls = []

    def complete(self, *, system, user, model=None, json_mode=False, max_tokens=None):
        self.calls.append({"system": system, "user": user, "model": model})
        text = self.outputs.pop(0) if self.outputs else "{}"
        if callable(text):  # lets a test react to the evidence actually shown
            text = text(self.calls[-1])
        return LLMResult(text=text, model=model or "fake", prompt_tokens=100, completion_tokens=20)


@pytest.fixture
def fake_llm():
    def make(*outputs):
        llm = FakeLLM(*outputs)
        set_llm(llm)
        return llm

    return make
