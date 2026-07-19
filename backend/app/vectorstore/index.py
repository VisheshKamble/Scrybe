import json
from pathlib import Path

import faiss

from app.config import settings
from app.vectorstore.embeddings import embed_texts

STORE_DIR = Path(settings.vector_store_path)
STORE_DIR.mkdir(parents=True, exist_ok=True)


class VideoIndex:
    """One FAISS index per video. Every chunk carries a timestamp and a
    source tag ("transcript" or "visual") so answers can cite the exact
    moment in the video they came from.
    """

    def __init__(self, video_id: str):
        self.video_id = video_id
        self.index_path = STORE_DIR / f"{video_id}.index"
        self.meta_path = STORE_DIR / f"{video_id}.json"
        self.chunks: list[dict] = []
        self.index = None

    def build(self, chunks: list[dict]) -> None:
        self.chunks = chunks
        vectors = embed_texts([c["text"] for c in chunks]).astype("float32")
        self.index = faiss.IndexFlatIP(vectors.shape[1])
        self.index.add(vectors)
        faiss.write_index(self.index, str(self.index_path))
        self.meta_path.write_text(json.dumps(chunks))

    def load(self) -> None:
        self.index = faiss.read_index(str(self.index_path))
        self.chunks = json.loads(self.meta_path.read_text())

    def search(self, query: str, k: int = 5) -> list[dict]:
        if self.index is None:
            self.load()
        query_vec = embed_texts([query]).astype("float32")
        _scores, ids = self.index.search(query_vec, k)
        return [self.chunks[i] for i in ids[0] if i != -1]
