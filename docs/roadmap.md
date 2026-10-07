# Roadmap

**Done:** answer cache; quiz/plan/follow-up UI; quiz counters; structured comparison; job lifecycle + idempotency; YouTube gate/cooldown/backoff; structured errors; storage abstraction (local/S3); split queues; Ask agent (plan/retrieve/reason/verify), quiz, study plan, multi-video compare; injection tests; offline eval harness; CI.

**Next (highest value)**
- Run `--embedder sentence-transformers` and `--llm` evals on 5–10 *real* transcripts; calibrate `RETRIEVAL_MIN_SCORE`; publish results.
- Authentication + per-user ownership of videos; deletion endpoint; retention TTLs.
- Frontend: click-test and screen-reader-test all new screens; persist generated quizzes/plans (Quizzes and Plans pages currently regenerate on demand); thumbnails/titles for library items without a stored title.
- Adaptive multi-turn teacher; LLM entailment check for compare points.

**Later**
- `VideoSource` abstraction for uploads / audio / PDFs (storage, embedding and LLM abstractions already exist).
- Concept graph for navigation; cross-encoder reranker; LLM entailment verification; OpenTelemetry export; shared vector DB.

**Good first issues:** new `EmbeddingProvider`, new `LLMProvider`, additional planner rules + tests, extra eval cases, frontend citation UX, docs fixes.
