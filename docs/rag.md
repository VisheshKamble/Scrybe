# RAG

## Chunking (`vectorstore/chunking.py`)
Caption/Whisper segments (2–6 s) are deduplicated (auto-captions repeat in rolling windows) and merged into windows of ≈`CHUNK_TARGET_SECONDS` (40) or `CHUNK_MAX_CHARS` (900). Each chunk stores `chunk_id, video_id, start_time, end_time, chapter, source (transcript|visual), text`. Key-frame descriptions are separate chunks. Not implemented: per-chunk `topic`.

## Embeddings and index
`EmbeddingProvider` (`vectorstore/embeddings.py`): `SentenceTransformerEmbedder` (MiniLM, production) and `HashEmbedder` (lexical baseline for tests/eval). Per-video FAISS `IndexFlatIP` over normalized vectors (cosine). Persisted via `StorageService`.

## Retrieval
Top-k per video with a similarity floor (`RETRIEVAL_MIN_SCORE`, 0.25 default). The floor is calibrated for MiniLM; **it is untested against real transcripts**, so tune it with the eval harness before trusting abstention behavior. Multi-video asks retrieve per video and merge by score. No reranker yet (extension point: after `retrieve_chunks`).

## Cost controls
No full transcripts are sent to the LLM: ≤`EVIDENCE_MAX_CHARS` (6000) of selected chunks per call. No-evidence questions make **zero** LLM calls. Planning is free. One LLM call per answer (two on revision). Usage is returned per request (`usage.prompt_tokens`, `completion_tokens`, `llm_calls`, `latency_ms`); `est_cost_usd` is only computed if you set `LLM_PRICES`. Answer caching is implemented (see agent-system.md). Not implemented: prompt compression.

## Evaluation
```bash
cd backend
PYTHONPATH=. python scripts/evaluate_rag.py --report ../docs/eval-report.md
PYTHONPATH=. python scripts/evaluate_rag.py --embedder sentence-transformers   # semantic
PYTHONPATH=. python scripts/evaluate_rag.py --llm                              # + citation validity, fallback rate, latency, tokens
```
Dataset: `backend/eval/dataset.json` (questions, relevant time range, expected intent, out-of-corpus questions). Metrics: hit@1/3/k, MRR, abstention on out-of-corpus, planner routing, retrieval latency; with `--llm`: citation validity, fallback rate, agent latency, tokens. **Current published result** ([eval-report.md](eval-report.md)) is the lexical baseline on a *synthetic 8-chunk lecture*. It is a regression smoke test, not evidence of real-world quality. Groundedness, quiz correctness and study-plan relevance are not yet measured.
