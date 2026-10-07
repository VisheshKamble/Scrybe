# Security & privacy

## Threat model & controls
| Risk | Control | Verified by |
|---|---|---|
| SSRF / arbitrary fetch | Host allowlist, no userinfo/ports, canonical URL rebuilt; yt-dlp is the only fetcher | `test_errors_and_validation.py` (URL table incl. `169.254.169.254`, `@` tricks) |
| Command injection | `subprocess` with arg list (no shell); URL passed after `--`; ids regex-gated | `test_ytdlp.py` |
| Path traversal | `video_id`/`job_id` strict regex; storage keys validated and resolved under root | `test_storage.py`, API tests |
| Prompt injection via transcripts | Evidence is data in the *user* turn with delimiters; system rules say never obey it; delimiter tags neutralized; model output can't create citations or timestamps | `test_ask.py` (injection tests, mutation-checked) |
| Abuse / cost | Redis rate limit per client, daily job quota, active-job cap, input size caps | `test_api.py` |
| Info leakage | Structured errors only; tracebacks to logs; logs exclude prompts/evidence/keys | `test_api.py::test_unhandled_error_hides_traceback` |
| Secrets | `.env` ignored; no secrets in image; cookies path optional and never committed | review |
| Oversized uploads | Screenshot endpoint capped at 5 MB, id validated | review (no dedicated test) |

## Known gaps (be aware before exposing publicly)
- **No authentication/authorization.** "User" = client IP (`X-Forwarded-For` if `TRUST_FORWARDED_FOR`, which is spoofable if the API is reachable without your proxy). Anyone who knows a `video_id` can read its report/ask questions. Fine for a personal/self-hosted instance; add auth before multi-tenant use.
- No data-deletion endpoint (would be unsafe without auth). Delete objects in storage manually.
- Injection defense is layered but not a guarantee. The agent has no dangerous tools, which bounds the impact.
- Rate limiting fails open if Redis is unreachable.

## Privacy: what is stored and sent
- **Stored (object storage):** processed reports, chunk text + FAISS index, optionally the source video (`RETAIN_SOURCE_VIDEO`, default: deleted after success; kept after failure so a retry doesn't re-download). **Redis:** job records (TTL `JOB_TTL_SECONDS`, default 7 d), rate-limit counters, Celery results (TTL). **Local scratch:** per-job temp dirs, always removed in `finally`. **Browser:** history/chat in localStorage.
- **Sent to the AI provider (Groq):** audio (when no captions exist), key-frame images, transcript passages for summaries/claims, retrieved evidence + your question for Ask. Nothing else; keys are never put in prompts.
- **Retention:** no automatic expiry of reports/indexes yet (roadmap).
