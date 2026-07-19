from sentence_transformers import SentenceTransformer

from app.config import settings

# Loaded once per process. Kept local (not a Groq call) so the vector
# store never depends on a rate-limited API just to embed text.
_model = SentenceTransformer(settings.embedding_model)


def embed_texts(texts: list[str]):
    return _model.encode(texts, normalize_embeddings=True)
