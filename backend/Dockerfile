FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-fetch the sentence-transformers embedding model at build time so it's
# baked into the image layer instead of being downloaded from Hugging Face
# every time a fresh container starts. This is what keeps the backend's
# healthcheck below reliable on cold starts -- without it, the first
# `docker compose up --build` can take longer to import app.main than the
# healthcheck's retry budget allows, which fails worker/frontend's
# `depends_on: condition: service_healthy`.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
