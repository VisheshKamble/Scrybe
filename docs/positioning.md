# Positioning, demo, pitches and interview notes

No metric below is invented. Where a number would help, it says what to measure.

## Positioning
- **Tagline:** Don't watch hours. Ask Scrybe.
- **Subline:** Turn long-form video into knowledge you can search, understand, and act on.
- **One line:** Scrybe is an open-source agentic AI knowledge layer for long-form video.
- **Not:** "an AI YouTube summarizer". Differentiators: timestamp-grounded answers; verified, bounded agent; async, independently scalable ingestion; self-hostable; extension points (LLM, embedder, storage); an evaluation harness.

**GitHub tagline:** Open-source agentic AI that turns long-form video into a searchable knowledge base with timestamp-grounded answers.

**30 s:** Scrybe turns a long video into something you can ask questions of. Paste a URL; it indexes the transcript and visuals; ask anything and get an answer with clickable timestamps, checked against the evidence. If the video doesn't say it, Scrybe says so.

**60 s:** (30 s) + Under the hood, ingestion is asynchronous: FastAPI enqueues a job, Celery workers download under cluster-wide limits so we don't get our own IP blocked, a LangGraph pipeline builds chapters and a FAISS index, and a separate agent graph plans, retrieves, reasons and verifies each answer. It also generates quizzes, study plans and multi-video comparisons grounded in the same evidence.

**2-minute technical:** Cover: (1) job lifecycle and idempotency (deterministic video id, `acks_late` + idempotent tasks); (2) YouTube reality, two separate problems (extractor challenges vs IP throttling), Redis gate + cooldown + bounded backoff, structured errors; (3) storage abstraction because Render disks are ephemeral; (4) chunking and retrieval with similarity floor and zero-LLM abstention; (5) agent as an explicit graph with typed tools, one revision max, fallback; timestamps derived from metadata; (6) injection boundaries and tests, mutation-checked; (7) honest eval: synthetic lexical baseline, what is not yet measured.

**LinkedIn / X / Reddit / Dev.to:** lead with the problem ("2 hours → the 5 minutes you need"), one screenshot/GIF of an answer with timestamps, the architecture diagram, and the honest status table. Dev.to outline: why summarizers aren't enough → grounding by construction → handling YouTube blocking honestly → testing an LLM agent without an LLM → what I measured and what I didn't.

## Demo (60–90 s)
1. Paste a 1–2 h technical talk. 2. Show async progress (stage + %). 3. "Ready": chapters/summary. 4. Ask *"What are the most important concepts?"* → answer with timestamp chips. 5. Click a chip: video jumps. 6. *"Explain caching like I'm a beginner."* (teach mode). 7. *"Give me five interview questions."* (quiz, each with source time). 8. *"I have 3 days to learn this."* (plan built from real chapters). 9. End card: **Don't watch hours. Ask Scrybe.**
Status: the Ask chat renders citation chips, quizzes (graded locally, counters only), study plans and follow-up buttons; these views build but have not been click-tested, so rehearse the demo before recording.

## Resume bullets (add real numbers once measured)
- Built **Scrybe**, an open-source agentic video-knowledge platform (FastAPI, Celery, Redis, LangGraph, FAISS) that turns long-form video into timestamp-grounded, question-answerable knowledge.
- Designed an idempotent, retry-safe ingestion pipeline with Redis-enforced cluster-wide YouTube concurrency, spacing and block cooldown; classified failures into a structured error taxonomy.
- Implemented a bounded LangGraph agent (planner → typed retrieval tools → reasoning → verification) with metadata-derived citations, safe fallback, and prompt-injection boundaries covered by mutation-checked tests.
- Wrote a 140-test suite and an offline RAG evaluation harness; exercised the stack against real Redis/Celery workers. *(Add: retrieval hit@k on real transcripts, p50/p95 latency, cost per answer, after you measure them.)*

## Interview Q&A (short answers)
- **Why Celery/Redis?** Minutes-long jobs vs ms API; Redis was the broker and gives atomic primitives for leases, cooldowns and rate limits.
- **Why async?** The API must never hold a download; jobs survive restarts because state is in Redis.
- **Duplicate jobs?** Deterministic `video_id`; `find_or_create` returns the existing non-failed job; tasks re-check state and stored artifacts; a Redis lock guards concurrent processing.
- **Retry?** Exponential backoff + jitter, per-error retryability, bounded budget, permanent errors fail fast; `acks_late` redelivery is safe because tasks are idempotent.
- **YouTube 429?** Classify → trip a cluster cooldown → back off → fail clearly after the budget; the architecture lets the ingestion worker move to other egress. PO tokens fix extractor challenges, not IP blocks.
- **Control concurrency?** Redis lease set + `SET NX PX` spacing, shared by all workers.
- **Why object storage?** Ephemeral/non-shared disks; API and workers run on different machines.
- **Why FAISS/embeddings/RAG?** Exact search is enough at hundreds of chunks per video; avoids sending whole transcripts; gives citable evidence.
- **Why LangGraph/agents?** Explicit state and bounded control flow (plan/retrieve/verify/fallback) are debuggable; "agentic" is justified by tool use and verification, not by chat alone.
- **Prompt injection?** Role separation, delimiter neutralization, no dangerous tools, citation/timestamp derived server-side; reduces but doesn't eliminate risk.
- **Evaluate RAG?** Labeled questions → hit@k/MRR/abstention; with an LLM → citation validity, fallback rate; currently synthetic/lexical only, and I say so.
- **Reduce LLM cost?** Retrieval caps, zero-call abstention, free planner, smaller model for quiz/plan; caching is next.
- **Worker failure?** Late acks + reject-on-worker-lost redeliver; leases expire; temp dirs cleaned in `finally`.
- **100 → 100k users?** See the table in [architecture.md](architecture.md); measure before each step.
