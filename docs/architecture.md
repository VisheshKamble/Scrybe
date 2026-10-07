# Architecture

```
Frontend ─▶ FastAPI ─▶ job record (Redis) ─▶ Celery
                                              ├─ youtube_ingestion ─▶ [yt-dlp] ─▶ Object storage (videos/)
                                              ├─ video_processing  ─▶ transcript · vision · chapters · claims
                                              │                        ─▶ chunks ─▶ FAISS index + report (storage)
                                              ├─ ai_tasks          ─▶ comparison
                                              └─ embeddings, reports  (reserved, routed, currently unused)
Ask Scrybe (API process): Planner ─▶ Retrieve ─▶ Reason ─▶ Verify ─▶ Answer
```

## Components

| Component | Where | Notes |
|---|---|---|
| API | `app/main.py`, `app/routes/` | Stateless. All state is in Redis or object storage, so any number of replicas work. |
| Job store | `app/jobs.py` | Redis hashes. States: `queued downloading downloaded processing indexing completed retrying rate_limited failed`. Job id ≠ Celery task id. |
| Idempotency | `app/validation.py`, `jobs.find_or_create_for_video` | `video_id` is a hash of the YouTube id, so re-submitting returns the existing job/report. Only a *failed* job is replaced. |
| YouTube gate | `app/ingestion/gate.py` | Redis lease set (concurrency), `SET NX PX` (spacing), cooldown key (IP block). |
| Storage | `app/storage/` | `StorageService`: `upload upload_file download download_file delete exists get_url`. Local and S3 backends. |
| Index | `app/vectorstore/` | Per-video FAISS flat-IP index + chunk metadata, persisted through storage, cached locally. |
| Ask | `app/ask/` | See [agent-system.md](agent-system.md). |
| Errors | `app/errors.py` | The only place that string-matches provider output. |
| Tracing | `app/observability.py` | One JSON log line per span; never logs prompts, evidence text, or keys. |

## Why these choices

- **Celery + Redis**: downloads and pipeline runs take minutes; the API must answer in milliseconds. Redis was already the broker, and also provides the atomic primitives for rate limits, leases and cooldowns.
- **`acks_late` + `reject_on_worker_lost`**: a crashed worker's task is redelivered. That is only safe because every task is idempotent (checks job state, report existence, and stored artifacts first) and `visibility_timeout` exceeds task time limits.
- **`prefetch_multiplier=1`**: a worker holding a 20-minute task must not reserve more messages behind it.
- **Object storage**: Render disks are ephemeral and not shared between services. Reports, indexes and source video go through `StorageService`.
- **FAISS flat index per video**: exact search is fast at this scale (hundreds of chunks per video); no vector DB to operate. Swap point: `VideoIndex`.
- **Separate queues**: scale YouTube egress (kept tiny) independently of CPU/LLM work.

## Scaling path (stages are design guidance; only stage 1 is implemented/tested)

| Users | First bottleneck | Change | Cost concern |
|---|---|---|---|
| ~10 | YouTube IP reputation | bgutil + cooldown + 1 concurrent download (implemented) | none |
| ~100 | Single combined container | Split API / youtube / processing workers; S3 storage | worker hours |
| ~1k | LLM rate limits & spend | Cache answers per (video, question); smaller model for quiz/plan; per-user quotas | LLM tokens |
| ~10k | YouTube blocking; index size | Dedicated residential/egress proxy or separate ingestion service; shared vector DB (pgvector/Qdrant); auth + per-user data | egress, DB |
| ~100k | Redis as broker, ingest throughput | Managed broker (SQS/Rabbit), autoscaled workers, dedupe by content hash across users, CDN for static, observability stack | everything |

Do not build the later stages before measuring the earlier ones.
