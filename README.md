# Scrybe — Agentic Video Intelligence

Upload a YouTube link (or a screenshot from one) and Scrybe watches it — transcript,
on-screen visuals, chapters, fact-checked claims, and a timestamp-grounded Q&A chat —
all through a multi-agent LangGraph pipeline running on Groq.

## Architecture

Video/screenshot input → **Transcript agent** (captions or Whisper) +
**Visual agent** (keyframes → vision model) → **Segmentation agent** (chapters) →
**Synthesis agent** (fact-checks claims via Groq Compound's built-in web search,
streams the summary) → FAISS vector index (timestamp-tagged) → React frontend
(live streaming report, chat, multi-video comparison, PDF/markdown export).

## Models (Groq)

| Purpose                      | Model                  |
|-------------------------------|------------------------|
| Reasoning / synthesis / QA    | `openai/gpt-oss-120b`  |
| Fast structured tasks (chapters) | `openai/gpt-oss-20b` |
| Vision (keyframes/screenshots)| `qwen/qwen3.6-27b`     |
| Speech-to-text fallback       | `whisper-large-v3-turbo` |
| Fact-checking (built-in web search) | `groq/compound`  |

## Running locally

```bash
cp backend/.env.example backend/.env   # add your GROQ_API_KEY
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend docs: http://localhost:8000/docs

## Running without Docker

```bash
# backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload &
celery -A app.celery_app worker --loglevel=info &

# frontend
cd ../frontend
npm install
npm run dev
```

## Notes

- Scope the public demo to short or your own uploaded clips — YouTube's terms
  restrict automated downloading of arbitrary public videos at scale.
- `transcript` and `visual` agents don't depend on each other; the graph runs
  them sequentially for simplicity, but they can be parallelized with a
  fan-out/fan-in edge in `app/agents/graph.py`.
