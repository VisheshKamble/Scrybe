from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # model_config disables pydantic's "model_" protected-namespace check --
    # our model_reasoning/model_fast/etc. fields are just our own settings
    # names, not pydantic model internals, so the warning is a false alarm.
    model_config = SettingsConfigDict(env_file=".env", protected_namespaces=())

    groq_api_key: str
    redis_url: str = "redis://localhost:6379/0"
    vector_store_path: str = "./data/vector_store"
    max_keyframes_per_video: int = 24
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Comma-separated list of origins allowed to call the API (CORS). The
    # default covers the Vite dev server used by docker-compose; override
    # via the CORS_ORIGINS env var (e.g. "https://scrybe.example.com,https://www.scrybe.example.com")
    # for any deployment that isn't localhost:5173.
    cors_origins: str = "http://localhost:5173"

    # How long a finished job's status/result stays queryable from Redis
    # (celery result backend). Kept generous rather than Celery's 1-hour
    # default so a job that finished while nobody was watching (tab closed,
    # laptop slept) is still resolvable from History much later -- the
    # report itself is durable on disk regardless, but the job_id -> status
    # lookup that Report/CompareResult poll on is only backed by this.
    celery_result_expires_seconds: int = 24 * 60 * 60

    # -- Queues / Celery ---------------------------------------------------
    # Soft limit raises SoftTimeLimitExceeded inside the task (lets it clean
    # up); the hard limit kills the child. Hard must be > soft.
    ingest_soft_time_limit: int = 900
    ingest_time_limit: int = 960
    process_soft_time_limit: int = 3300
    process_time_limit: int = 3420
    # Redis broker re-delivers an un-acked message after this many seconds.
    # With acks_late this MUST exceed the longest task time limit, otherwise a
    # healthy long task is delivered a second time to another worker.
    broker_visibility_timeout: int = 3600 * 2

    # -- YouTube ingestion -------------------------------------------------
    # Cluster-wide cap (enforced in Redis, not per-process) on simultaneous
    # yt-dlp runs and on spacing between them.
    youtube_max_concurrent_downloads: int = 1
    youtube_min_request_delay: float = 5.0
    youtube_max_retries: int = 3
    youtube_retry_base_seconds: float = 30.0
    youtube_retry_max_seconds: float = 900.0
    # After an IP-level 429/bot-check, every worker backs off for this long
    # instead of each one re-discovering the block by hitting YouTube again.
    youtube_cooldown_seconds: int = 300
    youtube_download_timeout_seconds: int = 840
    youtube_max_height: int = 720
    # Optional bgutil PO Token provider HTTP server, e.g. http://bgutil:4416.
    # Empty = rely on the plugin's default (http://127.0.0.1:4416).
    bgutil_base_url: str = ""
    # Optional single, operator-controlled egress proxy (NOT a free-proxy
    # pool) and optional cookies file. Both off by default.
    ytdlp_proxy: str = ""
    ytdlp_cookies_file: str = ""

    # -- Storage -----------------------------------------------------------
    storage_backend: str = "local"  # "local" | "s3"
    storage_local_path: str = "./data/storage"
    s3_bucket: str = ""
    s3_endpoint_url: str = ""  # set for R2 / MinIO / B2 etc.
    s3_region: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    # Source video is only needed during processing; delete it from object
    # storage once the report exists unless this is set.
    retain_source_video: bool = False
    # Scratch dir for per-job temp files (always deleted in `finally`).
    work_dir: str = "./data/work"

    # -- Abuse limits (enforced in Redis, shared across API instances) -----
    api_rate_limit: int = 60  # requests / minute / client
    max_video_jobs_per_user: int = 20  # submissions / 24h / client
    max_active_jobs_per_user: int = 3
    trust_forwarded_for: bool = True  # Render/most PaaS sit behind a proxy
    job_ttl_seconds: int = 7 * 24 * 3600

    # -- Ask Scrybe (agent) -----------------------------------------------
    retrieval_top_k: int = 8
    retrieval_min_score: float = 0.25
    evidence_max_chars: int = 6000
    # 0 disables. Cached only for successful, grounded answers.
    answer_cache_ttl_seconds: int = 3600
    agent_max_steps: int = 8
    agent_llm_timeout_seconds: float = 60.0
    verify_min_grounding: float = 0.35
    embedding_provider: str = "sentence-transformers"  # | "hash" (tests/eval)
    chunk_target_seconds: float = 40.0
    chunk_max_chars: int = 900
    # Optional $/1M-token prices so cost can be *estimated*; no defaults are
    # invented. Format: "model:input_price:output_price,model2:..."
    llm_prices: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    # Groq model IDs kept in one place -- a future Groq deprecation
    # only needs a change here, not a hunt through the codebase.
    model_reasoning: str = "openai/gpt-oss-120b"
    model_fast: str = "openai/gpt-oss-20b"
    model_vision: str = "qwen/qwen3.6-27b"
    model_asr: str = "whisper-large-v3-turbo"
    model_factcheck: str = "groq/compound"

    # -- Long-video handling --
    # Groq's real upload ceiling for audio transcription is ~25MB. We chunk
    # under a slightly lower number so multipart/container overhead never
    # pushes an individual upload over the actual line.
    groq_audio_max_bytes: int = 24 * 1024 * 1024
    audio_sample_rate_hz: int = 16000
    audio_bitrate_kbps: int = 64

    # A raw multi-hour transcript is too large to hand a chat model in one
    # prompt. Below this many characters it's sent as-is; above it, it's
    # condensed first (see app/agents/text_utils.py).
    transcript_direct_char_limit: int = 60_000
    transcript_condense_chunk_chars: int = 12_000

    # Chapter detection gets one line per transcript segment. A multi-hour
    # video can produce thousands of raw Whisper segments, which is its own
    # way of blowing up a prompt -- above this count, segments are bucketed
    # into fixed time windows first instead of being sent one-per-line.
    segmentation_max_raw_segments: int = 400
    segmentation_bucket_seconds: float = 45.0

    # Spacing between consecutive fact-check calls (Groq's compound model
    # burns tokens internally on web search that count against the
    # account's tokens-per-minute budget). A small gap between calls
    # avoids bursting that budget in the first place, on top of the
    # reactive retry/backoff in retry_utils.py.
    factcheck_call_spacing_seconds: float = 2.0


settings = Settings()
