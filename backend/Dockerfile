FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    DENO_INSTALL=/usr/local \
    HF_HOME=/opt/hf

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 \
    curl unzip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp needs a JavaScript runtime for YouTube's player challenges.
# Installed system-wide (not under /root) so the non-root user can run it.
# NOTE: unpinned (latest). Pin a version here for fully reproducible builds.
RUN curl -fsSL https://deno.land/install.sh | sh

RUN useradd --create-home --uid 10001 scrybe

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

# Bake the embedding model into the image so cold starts don't download it.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')" \
    && chmod -R a+rX /opt/hf

COPY --chown=scrybe:scrybe . .
RUN chmod +x render_entrypoint.sh worker_entrypoint.sh \
    && mkdir -p /app/data && chown -R scrybe:scrybe /app/data

USER scrybe
EXPOSE 8000
# Bind 0.0.0.0:$PORT (Render injects PORT). No secrets are baked into the image.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
