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
