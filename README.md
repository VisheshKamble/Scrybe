# Scrybe

### Don't watch hours. Ask Scrybe.

**Scrybe is an open-source, self-hostable agentic knowledge layer for long-form video.** Give it a YouTube video; it builds a searchable, timestamp-indexed knowledge base you can question, learn from, and quiz yourself on. Every answer links back to the exact moments in the video that support it.

> *"I don't need to watch two hours to find the five minutes I need."*

**Why it exists.** Summarizers give you one blob of text you can't verify. Scrybe keeps the evidence: it retrieves the relevant transcript passages, answers only from them, checks the answer against them, and shows you the timestamps. If the video doesn't contain the answer, it says so instead of guessing.

## How it works

```
Video ─▶ Ingestion ─▶ Transcript ─▶ Chunks + Embeddings ─▶ Knowledge Index (FAISS)
                                                                  │
 You ─▶ Ask Scrybe ─▶ Planner ─▶ Retrieve ─▶ Reason ─▶ Verify ─▶ Answer + clickable timestamps
                                  (typed tools, bounded steps, one revision max, safe fallback)
```

| Layer | What it does |
|---|---|
| **Async ingestion** | `POST /api/videos` returns a job instantly. A dedicated `youtube_ingestion` queue downloads under cluster-wide concurrency/spacing limits, a 429 cooldown, and bounded exponential-backoff retries. |
| **Processing** | A LangGraph pipeline (transcript, keyframe vision, chapters, summary, claim fact-check) feeds a ~40 s-window chunker and a FAISS index. |
| **Ask Scrybe** | LangGraph agent: deterministic planner → retrieval tools → reasoning → verification. Handles Q&A, "teach me", quizzes, study plans, and multi-video comparison. |
| **Grounding** | Timestamps are *derived from retrieved evidence metadata*, never written by the model. Unknown citations and model-written timestamps are stripped; ungrounded answers fall back. |
| **Safety** | Transcripts are untrusted data: separated from instructions, delimiter-neutralized, and covered by injection tests. |

## Quick start

```bash
git clone <your-fork-url> scrybe && cd scrybe
cp backend/.env.example backend/.env      # set GROQ_API_KEY
docker compose up --build                 # UI http://localhost:5173 · API http://localhost:8000/docs
```

Details: [local development](docs/local-development.md) · [deploying to Render](docs/deployment.md).

## Status (what is and isn't verified)

| Area | Status |
|---|---|
| Job lifecycle, idempotency, retries, 429 cooldown, concurrency gate, cleanup | Implemented · unit-tested · exercised against real Redis + Celery worker |
| YouTube errors → structured codes, bounded retries | Implemented · tested with mocked yt-dlp · real run hit sandbox network failure path |
| PO Token provider (bgutil) | Plugin loads in yt-dlp (verified). **Token generation against live YouTube: not verified.** |
| Pipeline (ffmpeg → scenedetect → graph → FAISS → report) | Ran end-to-end in a real worker against a *fake* LLM endpoint. Real Groq quality: not verified. |
| Ask agent: planner, retrieval, verification, injection defense | Implemented · 41 tests · real HTTP run against fake LLM |
| Quiz / study plan / structured compare | Implemented · unit-tested with scripted LLM · **not tested with a real model** |
| Answer cache, quiz result counters | Implemented · unit-tested (cache invalidation mutation-checked) |
| Student "Test Yourself" flow (paste video → quiz → review → study plan, XP/streak), animated agent trace | Implemented · production build passes · **not click-tested**; agent trace is unit-tested server-side |
| Frontend: Library, multi-video Ask, compare view, Quizzes/Plans pages, hero, a11y/mobile CSS | Implemented · production build passes · **not visually, interactively or screen-reader tested** |
| S3 storage | Tested with moto (mocked S3), not a live bucket |
| Docker image build, compose stack, Render deploy | Written and YAML-validated · **not built or deployed here** |
| RAG metrics | [Offline lexical baseline on a synthetic set](docs/eval-report.md). **No real-video or semantic-model numbers yet.** |

Known gaps and plans: [roadmap](docs/roadmap.md).

## Repository layout

```
backend/app/   routes/ (API) · tasks/ (Celery) · ingestion/ (yt-dlp, gate) · ask/ (agent) · agents/ (video pipeline)
               vectorstore/ (chunking, embeddings, FAISS) · storage/ (local, S3) · errors.py · jobs.py · ratelimit.py
backend/tests/ 140 tests, no network      backend/eval/ + scripts/evaluate_rag.py   frontend/ React app      docs/
```

## Documentation

[Architecture & scaling](docs/architecture.md) · [YouTube ingestion](docs/youtube-ingestion.md) · [Agent system](docs/agent-system.md) · [RAG & evaluation](docs/rag.md) · [Security & privacy](docs/security.md) · [Deployment](docs/deployment.md) · [Positioning, demo & interview notes](docs/positioning.md) · [Contributing](CONTRIBUTING.md)

## Tech stack

FastAPI · Celery · Redis · yt-dlp (+ Deno, bgutil PO Token provider) · FFmpeg · LangGraph · Groq · sentence-transformers · FAISS · S3-compatible storage · React + Vite + Tailwind

## License

MIT. See [LICENSE](LICENSE).
