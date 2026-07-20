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

The frontend root (`/`) is the marketing landing page; the actual tool (upload,
report, chat, compare) lives under `/app`.

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

## Long videos & the Groq 413 fix

Videos with no YouTube captions fall back to Whisper via Groq, which caps
uploads at roughly 25MB. Two things make that a non-issue regardless of
video length now:

1. **`app/ingestion/audio.py`** pulls a mono, 16kHz, low-bitrate audio-only
   track out of the video before it ever reaches Whisper (previously the
   *entire muxed video* was uploaded — video stream included — which is
   what actually caused the 413s).
2. **`app/agents/transcript_agent.py`** measures that file's real size and,
   if it's still over the limit, splits it into the minimum number of
   pieces needed (from its own measured bitrate, not a guess), transcribes
   each piece, and reassembles the transcript with corrected timestamps. If
   Groq rejects a piece that looked like it should fit, it's split again
   automatically. This is recursive and self-correcting, so it works the
   same way for a 5-minute clip or a 50-hour one — there's no hardcoded
   video-length ceiling anywhere in this path.

The chapter-detection and summary/claims prompts (`segmentation_agent.py`,
`synthesis_agent.py`) have the same class of problem one step downstream —
a multi-hour transcript is too large for a single chat-model prompt. Long
transcripts are condensed (synthesis) or time-bucketed (segmentation)
first; short/typical videos are unaffected and go through unchanged.

All of the relevant limits are tunable in `app/config.py`
(`groq_audio_max_bytes`, `audio_bitrate_kbps`,
`transcript_direct_char_limit`, `segmentation_max_raw_segments`, etc.) if
your Groq tier or use case needs different defaults.

### A second, different 413: chat completions vs. audio uploads

Groq returns HTTP 413 from `/chat/completions` too, but it means something
different there than it does for audio: in practice it's almost always a
tokens-per-minute rate limit, not the request itself being oversized --
this shows up most on `groq/compound` (used for fact-checking), since its
built-in web search burns tokens internally that never appear in the
prompt you sent, and free-tier TPM budgets are tight (single-digit
thousands of tokens/minute on some models).

`app/agents/retry_utils.py` retries 413/429 on chat completions with
backoff (the SDK's own retries only cover 429/5xx). If a single
fact-check still fails after retries, `fact_check_claim` reports that one
claim as unverifiable instead of raising -- the transcript, chapters, and
every other claim that already succeeded are kept rather than losing the
whole video over one claim. The same retry wrapper is used for
segmentation, keyframe descriptions, and transcript condensing, since
they're all subject to the same rate-limit class of failure.

### A third failure mode: JSON mode occasionally returns invalid JSON

Groq's structured-output mode (`response_format={"type": "json_object"}`,
used for chapters and claim extraction) can return an HTTP 400 with code
`json_validate_failed` when the model's own output didn't parse -- a
generation hiccup from a non-deterministic model, not a malformed
request. `retry_utils.py` retries this specifically (unlike other 400s,
which mean something is actually wrong with the request and aren't
retried), since the same prompt often succeeds on a second,
independently-sampled attempt.

If it's still failing after retries, `segmentation_agent.py` falls back
to a single "Full video" chapter and `synthesis_agent.py` falls back to
an empty claims list, both logging the failure to `state["errors"]`,
rather than crashing the task and losing the transcript, summary, and
everything else that already succeeded. This is the same "one step
degrading shouldn't lose the whole video" principle already used for
keyframe descriptions and fact-checking.

### A fourth failure mode: the summary never appears in the browser

This one isn't a Groq issue -- it's a pub/sub race in the app itself.
`synthesis_agent.py` publishes summary tokens to Redis as they're
generated; the frontend only opens that stream *after* polling
`/videos/{job_id}/status` sees `"done"`. But status doesn't flip to
`"done"` until the whole pipeline -- summary generation included -- has
already finished and published every token (and the final `[DONE]`) to a
channel nobody was subscribed to yet. Redis pub/sub has no memory, so
that client hangs on an empty summary forever, and the chapters/claims
panels were (incorrectly) gated behind that same stream finishing, so
they never appeared either.

Fixed on both ends:

- **`app/routes/stream.py`** now checks whether the report is already on
  disk before subscribing to Redis. If it is, the video's fully
  processed and there's nothing left to stream live -- it replays the
  finished summary as a single event instead of listening on a channel
  that will never receive anything. A client that connects *while* a
  video is still processing still gets the real live token-by-token
  stream.
- **`frontend/src/pages/Report.jsx`** no longer gates the chapters/claims
  fetch behind the summary stream completing -- they're independent data
  that's already sitting in the report file the moment the job is done,
  and shouldn't be blocked by an unrelated stream.
