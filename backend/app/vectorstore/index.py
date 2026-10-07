"""Per-video FAISS index persisted through StorageService (so API and workers
need not share a disk). A local cache dir holds the file FAISS reads."""

from __future__ import annotations

import json
import os
import tempfile
import time
from pathlib import Path

import faiss
import numpy as np

from app.config import settings
from app.errors import ErrorCode, ScrybeError
from app.storage import get_storage
from app.vectorstore.embeddings import embed_texts, embedding_dimension


class VideoIndex:
    def __init__(self, video_id: str):
        self.video_id = video_id
        self.cache_dir = Path(settings.vector_store_path)
        self.index_key = f"index/{video_id}.faiss"
        self.meta_key = f"index/{video_id}.json"
        self.chunks: list[dict] = []
        self.index = None

    def build(self, chunks: list[dict]) -> None:
        self.chunks = chunks
        try:
            if chunks:
                vectors = np.asarray(embed_texts([c["text"] for c in chunks]), dtype="float32")
                self.index = faiss.IndexFlatIP(vectors.shape[1])
                self.index.add(vectors)
            else:  # silent video: valid, just nothing to retrieve
                self.index = faiss.IndexFlatIP(embedding_dimension())
        except ScrybeError:
            raise
        except Exception as exc:
            raise ScrybeError(ErrorCode.EMBEDDING_FAILED, f"{type(exc).__name__}: {exc}") from exc

        self.cache_dir.mkdir(parents=True, exist_ok=True)
        local = self.cache_dir / f"{self.video_id}.faiss"
        faiss.write_index(self.index, str(local))
        storage = get_storage()
        storage.upload_file(self.index_key, str(local))
        storage.upload(self.meta_key, json.dumps(chunks), "application/json")
        try:  # invalidates cached answers for this video
            from app import redis_client

            redis_client.get_redis().set(f"index_ver:{self.video_id}", str(time.time()))
        except Exception:  # noqa: BLE001 - cache invalidation must never fail an index build
            pass

    def load(self) -> None:
        storage = get_storage()
        if not storage.exists(self.index_key) or not storage.exists(self.meta_key):
            raise ScrybeError(ErrorCode.INDEX_NOT_FOUND, self.video_id)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        local = self.cache_dir / f"{self.video_id}.faiss"
        if not local.exists():
            fd, tmp = tempfile.mkstemp(dir=self.cache_dir)
            os.close(fd)
            storage.download_file(self.index_key, tmp)
            os.replace(tmp, local)
        self.index = faiss.read_index(str(local))
        self.chunks = json.loads(storage.download(self.meta_key))

    def search(self, query: str, k: int = 5, min_score: float | None = None) -> list[dict]:
        """Top-k chunks with a `score` (cosine similarity), best first,
        optionally dropping anything below `min_score`."""
        if self.index is None:
            self.load()
        if self.index.ntotal == 0:
            return []
        try:
            q = np.asarray(embed_texts([query]), dtype="float32")
            scores, ids = self.index.search(q, min(k, self.index.ntotal))
        except Exception as exc:
            raise ScrybeError(ErrorCode.RETRIEVAL_FAILED, f"{type(exc).__name__}: {exc}") from exc
        out = []
        for score, i in zip(scores[0], ids[0]):
            if i == -1 or (min_score is not None and score < min_score):
                continue
            out.append({**self.chunks[i], "score": float(score)})
        return out

    def in_range(self, start: float, end: float, limit: int = 12) -> list[dict]:
        if self.index is None:
            self.load()
        hits = [c for c in self.chunks if c["end_time"] >= start and c["start_time"] <= end]
        return sorted(hits, key=lambda c: c["start_time"])[:limit]
