from pydantic_settings import BaseSettings


class Settings(BaseSettings):
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

    class Config:
        env_file = ".env"


settings = Settings()
