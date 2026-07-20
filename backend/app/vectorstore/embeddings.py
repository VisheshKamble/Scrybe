from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.config import settings


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    # Loaded lazily, on first use, and cached from then on (lru_cache with
    # maxsize=1 gives us a memoized singleton). Importing this module happens
    # as soon as FastAPI wires up the /api routes at startup -- if we loaded
    # the model at import time instead, Uvicorn couldn't bind the port (and
    # /health couldn't respond) until the model was fully loaded. Kept local
    # (not a Groq call) so the vector store never depends on a rate-limited
    # API just to embed text.
    return SentenceTransformer(settings.embedding_model)


def embed_texts(texts: list[str]):
    return _get_model().encode(texts, normalize_embeddings=True)
