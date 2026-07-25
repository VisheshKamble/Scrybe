# Scrybe

**Agentic video intelligence: a multi-agent AI pipeline that watches a YouTube video and produces a transcript, chapter breakdown, fact-checked claims, and a timestamp-grounded chat interface.**

Built as a full-stack system end to end: a LangGraph multi-agent backend, a Celery/Redis job pipeline, a FAISS vector index, and a React frontend, all designed around the practical failure modes of running LLM pipelines against arbitrary, unpredictable video content (variable length, missing captions, rate limits, model output that doesn't always follow the schema it was asked for).

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [How the Pipeline Works](#how-the-pipeline-works)
- [API Reference](#api-reference)
- [Frontend Routes](#frontend-routes)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Engineering Highlights](#engineering-highlights)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## Overview

Scrybe takes a YouTube URL and runs it through a pipeline of four cooperating AI agents built on LangGraph:

1. A **transcript agent** that uses YouTube's own captions when available, and falls back to Whisper (via Groq) when they aren't.
2. A **visual agent** that samples keyframes at scene changes and describes what's on screen using a vision-language model, so the pipeline understands slides, code, charts, and UI, not just speech.
3. A **segmentation agent** that turns the transcript and visual notes into a chapter breakdown.
4. A **synthesis agent** that extracts checkable factual claims, fact-checks them using a web-search-enabled model, and streams a summary back to the browser token by token as it's generated.

The output is indexed into a FAISS vector store (transcript lines and visual descriptions, each tagged with a timestamp) so a user can then ask free-form questions about the video and get an answer grounded in a specific moment, with a video player that jumps straight to it.

The system also supports comparing multiple videos on the same topic, side by side, with a synthesized comparison of where they agree, disagree, and each cover something the others don't.

Everything runs as a background job (Celery), so a video of any length can be submitted without holding an HTTP connection open, and the frontend polls for status and streams the summary live via Server-Sent Events as it's generated.

## Key Features

- **YouTube ingestion** via yt-dlp, with automatic caption detection and a Whisper fallback for videos that don't have any.
- **Visual understanding**, not just transcription: keyframes are sampled at detected scene changes (not fixed intervals, to avoid wasting model calls on near-duplicate frames) and described by a vision-language model.
- **Chapter detection** grounded in both transcript and visual content.
- **Automated fact-checking** of claims extracted from the video, using a model with built-in web search.
- **Live streaming summary** — the summary appears token by token in the browser as the model generates it, not after a long wait.
- **Timestamp-grounded chat** — ask a question about the video, get an answer with a citation to the specific second it came from, with the embedded player jumping there automatically.
- **Multi-video comparison** — submit two or more videos on the same topic and get a synthesized comparison, plus each video's own individual report.
- **PDF and Markdown export** of the full report.
- **Local run history** — every analysis and comparison is saved in the browser with a working link back in, no account system required.
- **Handles videos of any length** — a purpose-built recursive audio-chunking scheme means a five-minute clip and a fifty-hour video go through exactly the same code path (see [Engineering Highlights](#engineering-highlights)).

## Architecture

```
YouTube URL
     |
     v
  yt-dlp  ---------------------------->  captions (if available)
     |
     v
 video file
     |
     +--------------------+
     v                    v
 keyframe extraction   audio extraction
 (scene detection)     (mono, 16kHz, low bitrate)
     |                    |
     v                    v
                     Whisper transcription
                     (only if no captions)
     |                    |
     v                    v
 +------------------------------------------+
 |            LangGraph agent pipeline       |
 |                                            |
 |  transcript agent -> visual agent          |
 |        -> segmentation agent               |
 |        -> synthesis agent                  |
 |           (claim extraction, fact-check,   |
 |            streamed summary)               |
 +------------------------------------------+
     |
     v
 FAISS vector index (timestamp-tagged chunks)
     |
     v
 report.json  ---------------------------->  React frontend
     ^                                       (live progress, video player,
     |                                        chapters, claims, chat, export,
     |                                        history, comparison)
     |
 Redis pub/sub (live token streaming during processing)
```

The backend and the Celery worker share the same codebase and Docker image; the worker runs the actual pipeline, the backend serves the API and relays live progress from Redis to the browser over Server-Sent Events.

## Tech Stack

**Backend**
- Python, FastAPI
- LangGraph (agent orchestration)
- Celery + Redis (background job queue and pub/sub for live streaming)
- FAISS (vector similarity search)
- sentence-transformers (embeddings)
- yt-dlp (video/caption download)
- PySceneDetect + OpenCV (scene-change keyframe extraction)
- ffmpeg (audio extraction and chunking)
- WeasyPrint (PDF export)
- Groq API (all model inference — see table below)

**Frontend**
- React 18, React Router
- Vite
- Tailwind CSS
- Framer Motion (animation)
- Server-Sent Events (live summary streaming)
- Browser localStorage (run history and per-video chat threads — no backend account system)

**Infrastructure**
- Docker Compose (four services: FastAPI backend, Celery worker, Redis, Vite frontend)

**Models used (all served via Groq)**

| Purpose                                | Model                    |
|-----------------------------------------|--------------------------|
| Reasoning / synthesis / chat            | `openai/gpt-oss-120b`    |
| Fast structured-output tasks (chapters) | `openai/gpt-oss-20b`     |
| Vision (keyframe description)           | `qwen/qwen3.6-27b`       |
| Speech-to-text fallback                 | `whisper-large-v3-turbo` |
| Fact-checking (built-in web search)     | `groq/compound`          |

## How the Pipeline Works

1. **Ingestion.** `yt-dlp` downloads the video and, separately, attempts to pull auto-generated captions. If captions exist, Whisper is skipped entirely.
2. **Keyframe extraction.** PySceneDetect analyzes the video for scene changes (content-based detection, not fixed time intervals) and one frame is saved per detected scene, capped at a configurable maximum.
3. **Audio extraction.** If no captions were found, a mono, 16kHz, low-bitrate audio-only track is extracted with ffmpeg — deliberately not the full muxed video, which is what determines whether Whisper's upload limit becomes a problem later.
4. **Transcript agent.** Parses the caption file if present; otherwise transcribes via Whisper, using a self-correcting recursive chunking scheme for audio that exceeds Groq's upload limit (see below).
5. **Visual agent.** Sends each keyframe to a vision-language model and asks for a description of on-screen text, charts, code, UI, or actions — this is what lets the report speak to what's shown on screen, not just what's said.
6. **Segmentation agent.** Given the transcript and visual notes, produces a chapter breakdown with titles, timestamps, and per-chapter summaries. Falls back to a single "full video" chapter if structured output fails after retries, rather than losing the rest of the report.
7. **Synthesis agent.** Extracts up to six specific, checkable claims from the transcript; fact-checks each one using a model with built-in web search; and streams a 5-8 sentence summary to the browser token by token via Redis pub/sub.
8. **Indexing.** Every transcript line and visual description, each tagged with its timestamp, is embedded and written to a FAISS index scoped to that video, which is what powers the chat feature's timestamp-grounded answers.
9. **Serving.** The finished report is written to disk as JSON and served to the frontend; the FAISS index is loaded on demand when a chat question comes in.

## API Reference

All routes are served under `/api`. Interactive docs are available at `/docs` when the backend is running.

| Method | Path                             | Description |
|--------|-----------------------------------|--------------|
| POST   | `/api/videos`                    | Submit a YouTube URL for processing; returns a job ID |
| GET    | `/api/videos/{job_id}/status`    | Poll job status (`queued`, `processing`, `done`, `failed`) |
| GET    | `/api/videos/{video_id}/report`  | Fetch the finished report (summary, chapters, claims) |
| POST   | `/api/videos/screenshot`         | Upload a frame (backend stub — see Known Limitations) |
| GET    | `/api/stream/{video_id}`         | Server-Sent Events stream of the summary as it's generated |
| POST   | `/api/qa`                        | Ask a timestamp-grounded question about a processed video |
| POST   | `/api/compare`                   | Submit two or more YouTube URLs for a synthesized comparison |
| GET    | `/api/compare/{job_id}/status`   | Poll comparison job status and fetch the result |
| GET    | `/api/export/{video_id}/markdown`| Export the report as Markdown |
| GET    | `/api/export/{video_id}/pdf`     | Export the report as PDF |
| GET    | `/health`                        | Health check (used by Docker Compose) |

## Frontend Routes

The marketing/landing page lives at `/`; the application itself lives under `/app` and shares the same visual language so the two don't feel like separate products.

| Route                   | Page           | Purpose |
|--------------------------|----------------|----------|
| `/app`                   | Upload         | Submit a YouTube URL, with client-side validation |
| `/app/report/:jobId`     | Report         | Live pipeline progress, then the full report with a video player wired to every timestamp |
| `/app/chat/:videoId`     | Chat           | Ask questions about a processed video, grounded in specific timestamps |
| `/app/compare`           | Compare        | Submit two or more videos and an optional comparison focus |
| `/app/compare/:jobId`    | Compare Result | The synthesized comparison plus each video's individual chapters and claims |
| `/app/history`           | History        | Every video and comparison run in this browser, with a working link back in |

## Project Structure

```
Scrybe/
├── backend/
│   ├── app/
│   │   ├── agents/          # LangGraph agents: transcript, visual, segmentation, synthesis, QA
│   │   ├── ingestion/        # yt-dlp, ffmpeg audio extraction, keyframe extraction, screenshots
│   │   ├── models/           # Pydantic request/response schemas
│   │   ├── routes/           # FastAPI route handlers
│   │   ├── tasks/            # Celery task definitions
│   │   ├── vectorstore/      # FAISS index and embedding logic
│   │   ├── config.py         # Centralized settings (env-driven)
│   │   ├── celery_app.py
│   │   ├── streaming.py      # Redis pub/sub bridge for live summary streaming
│   │   ├── validation.py     # Shared input validation (video IDs, YouTube URLs)
│   │   └── main.py           # FastAPI app entrypoint
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # Shared UI components (video player, chapter list, etc.)
│   │   │   └── landing/      # Marketing page components
│   │   ├── pages/            # Route-level pages (Upload, Report, Chat, Compare, History)
│   │   ├── hooks/            # useSSE (live streaming)
│   │   ├── lib/               # API client, localStorage persistence, YouTube URL parsing
│   │   └── App.jsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── AUDIT.md                  # Engineering audit log: issues found and fixed during development
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- A Groq API key (free tier available at [console.groq.com](https://console.groq.com))

### Running with Docker (recommended)

```bash
cp backend/.env.example backend/.env
# edit backend/.env and set GROQ_API_KEY

docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend API docs: `http://localhost:8000/docs`

This starts four services: Redis, the FastAPI backend, the Celery worker (which does the actual video processing), and the Vite frontend. The first build takes a few minutes, since the backend image pre-downloads its embedding model at build time.

### Running without Docker

```bash
# backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload &
celery -A app.celery_app worker --loglevel=info &

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```

A local Redis instance is required either way (Celery's broker and result backend, and the pub/sub channel behind live summary streaming).

## Environment Variables

Set in `backend/.env` (see `backend/.env.example`):

| Variable                       | Required | Default                     | Description |
|----------------------------------|----------|------------------------------|--------------|
| `GROQ_API_KEY`                  | Yes      | —                            | API key for all model inference |
| `REDIS_URL`                     | No       | `redis://localhost:6379/0`  | Celery broker/result backend and pub/sub |
| `CORS_ORIGINS`                  | No       | `http://localhost:5173`     | Comma-separated list of allowed frontend origins |
| `CELERY_RESULT_EXPIRES_SECONDS` | No       | `86400`                      | How long a finished job's status stays queryable |
| `MAX_KEYFRAMES_PER_VIDEO`       | No       | `24`                          | Cap on keyframes sampled per video |

Additional tunables (model selection, audio chunking thresholds, transcript condensing limits) live in `backend/app/config.py`.

## Engineering Highlights

A few of the more involved problems this project solves, for anyone reviewing the code directly:

**Handling videos of any length within Groq's upload limits.** Whisper transcription via Groq caps uploads at roughly 25MB, which a video of even moderate length blows past if the full muxed file is sent. Scrybe extracts a mono, 16kHz, low-bitrate audio-only track before transcription (roughly a 10-20x size reduction on its own), and if a file is still too large, splits it into the minimum number of pieces needed based on its own measured bitrate, transcribes each piece, and reassembles the transcript with corrected timestamps — recursively, so it self-corrects if a piece that looked small enough still gets rejected. This is the same code path for a five-minute clip and a fifty-hour video, with no hardcoded length ceiling.

**Resilience against LLM output that doesn't follow its schema.** Structured-output ("JSON mode") calls occasionally fail to parse, and Groq's rate limits (particularly on the web-search-enabled fact-checking model, which burns tokens internally that never appear in the visible prompt) can trigger HTTP 413s that look like a request-size problem but are actually a tokens-per-minute issue. A shared retry helper distinguishes these cases from genuinely invalid requests and retries with backoff; if a step still fails after retries, it degrades gracefully (a single fallback chapter, an empty claims list, one claim marked unverifiable) rather than losing the entire report over one failed step.

**A real-time streaming architecture with a race condition fixed at the protocol level.** The summary is generated inside a Celery worker and streamed to the browser over Server-Sent Events via Redis pub/sub — but Redis pub/sub has no memory, so a client that connects after the tokens were already published gets nothing. Since the frontend only opens that connection after polling confirms the job is done — which is also when generation has already finished — that race was the common case, not an edge case. The fix checks whether the finished report is already on disk before subscribing to Redis: if so, the summary is replayed as a single event instead of listening on a channel that will never receive anything.

**Input validation applied at the boundary, not assumed from the frontend.** Several backend routes build filesystem paths or subprocess arguments from user-supplied values (video IDs, YouTube URLs). These are validated server-side against the exact shape the system actually produces or expects, independent of the frontend's own validation, since any API route is reachable directly.

**A keyframe path bug found through direct reproduction, not inspection.** Keyframe file paths were being reconstructed by hand from an assumed naming convention, rather than using the value the scene-detection library actually returns — which turned out to differ from both the library's own documented default and its docstring's stated indexing convention. This was caught and fixed by generating a real test video and verifying the fix against actual output on disk, rather than by reading the code alone.

## Known Limitations

Documented deliberately rather than left for someone else to discover:

- `POST /api/videos/screenshot` exists as a backend stub (it saves an uploaded frame to disk) but is not wired to anything — there is no frontend UI for it, and no visual-similarity search matching it against a video's keyframes. It is scaffolding for a future "ask about this moment from a screenshot" feature, not a finished one.
- Multi-video comparison dispatches one background job per video and combines the results; if any single video in the batch fails (age-restricted, private, region-locked), the entire comparison fails rather than reporting a partial result with the specific video identified.
- `docker-compose.yml` runs the frontend via the Vite development server end to end, not a production build behind a reverse proxy. This is intentional for local use and demos, not a deployment configuration.
- History and per-video chat threads are stored in the browser's localStorage. There is no backend account system, so clearing site data clears history too.

## License

MIT — see `LICENSE`.
