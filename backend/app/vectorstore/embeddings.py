"""Pluggable embedding providers. Add one by subclassing `EmbeddingProvider`
and registering it in `get_embedder()`."""

from __future__ import annotations

import abc
import hashlib
import re
from functools import lru_cache

import numpy as np

from app.config import settings


class EmbeddingProvider(abc.ABC):
    dimension: int

    @abc.abstractmethod
    def embed(self, texts: list[str]) -> np.ndarray:
        """Return float32, L2-normalised, shape (len(texts), dimension)."""


class SentenceTransformerEmbedder(EmbeddingProvider):
    def __init__(self, model_name: str):
        # Imported lazily so uvicorn can bind the port (and /health respond)
        # before torch is loaded.
        from sentence_transformers import SentenceTransformer

        self._model = SentenceTransformer(model_name)
        self.dimension = int(self._model.get_sentence_embedding_dimension())

    def embed(self, texts):
        return np.asarray(self._model.encode(texts, normalize_embeddings=True), dtype="float32")


_STOP = frozenset(
    """a an the and or but if of to in on at by for with from as is are was were be been being it its this that these those
what which who whom whose when where why how do does did can could should would will shall may might must i you he she we they me my your
our their about into over under than then there here so not no yes just also very more most some any each other such
speaker say says said video explain tell talk discuss mention mentioned give""".split()
)


class HashEmbedder(EmbeddingProvider):
    """Deterministic lexical embedder: stopword-filtered unigrams + bigrams,
    sublinear TF, feature-hashed into `dimension` buckets, L2-normalised. No
    model download, so it powers unit tests and serves as the *lexical
    baseline* in evaluation. It matches words, not meaning -- never report its
    numbers as semantic retrieval quality."""

    def __init__(self, dimension: int = 8192):
        self.dimension = dimension

    @staticmethod
    def _tokens(text: str) -> list[str]:
        words = [w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in _STOP]
        return words + [f"{a}_{b}" for a, b in zip(words, words[1:])]

    def embed(self, texts):
        out = np.zeros((len(texts), self.dimension), dtype="float32")
        for i, t in enumerate(texts):
            for tok in self._tokens(t):
                out[i, int(hashlib.md5(tok.encode()).hexdigest(), 16) % self.dimension] += 1.0
        out = np.log1p(out)
        norms = np.linalg.norm(out, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return (out / norms).astype("float32")


_override: EmbeddingProvider | None = None


def set_embedder(embedder: EmbeddingProvider | None) -> None:
    global _override
    _override = embedder
    _build.cache_clear()


@lru_cache(maxsize=1)
def _build() -> EmbeddingProvider:
    if settings.embedding_provider == "hash":
        return HashEmbedder()
    return SentenceTransformerEmbedder(settings.embedding_model)


def get_embedder() -> EmbeddingProvider:
    return _override or _build()


# Backwards-compatible helpers
def embed_texts(texts: list[str]):
    return get_embedder().embed(texts)


def embedding_dimension() -> int:
    return get_embedder().dimension
