# Contributing to Scrybe

Thanks for helping. Start small: pick an issue labelled `good first issue` or `help wanted`.

## Setup
See [docs/local-development.md](docs/local-development.md). Before opening a PR:
```bash
cd backend && ruff check . && ruff format --check . && python -m pytest -q
cd ../frontend && npm ci && npm run build
```
Tests must not touch the network: mock yt-dlp, use the fake LLM and `EMBEDDING_PROVIDER=hash`.

## Extension points
| To add… | Implement | Where |
|---|---|---|
| LLM | `LLMProvider.complete` | `app/llm.py` (`get_llm`) |
| Embedding model | `EmbeddingProvider.embed` | `app/vectorstore/embeddings.py` |
| Storage backend | `StorageService` | `app/storage/` (`get_storage`) |
| Vector DB | replace `VideoIndex` internals | `app/vectorstore/index.py` |
| Agent tool / intent | typed tool + planner rule + verify branch | `app/ask/` |
| Video source | produce `videos/<id>.mp4` (+ captions) in storage, dispatch `process_video_task` | `app/ingestion/` |
| Evaluator / metric | add to `scripts/evaluate_rag.py`, cases to `eval/dataset.json` | `backend/` |

## Guidelines
- Don't claim something works unless a test or documented run shows it; update the status table in the README when it changes.
- No invented benchmarks. Metrics come from `scripts/evaluate_rag.py` or your own measured runs (include method).
- Keep error handling in `app/errors.py`; don't string-match provider messages elsewhere.
- Never log prompts, transcript text or secrets. Never commit `.env`, cookies or media.
- Security issues: follow [SECURITY.md](SECURITY.md), not a public issue.
