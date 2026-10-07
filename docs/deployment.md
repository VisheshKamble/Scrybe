# Deployment (Render)

## Start simple: one service (what `render.yaml` ships)
One Docker web service runs the API and an embedded worker consuming **all** queues (`render_entrypoint.sh`). Free-tier friendly. Limits: the worker and API share CPU/RAM and a **local, ephemeral disk** (`STORAGE_BACKEND=local`): reports and indexes disappear on redeploy/restart. Fine for a demo; use S3 for anything you want to keep.

Required env: `GROQ_API_KEY`, `REDIS_URL` (Upstash `rediss://` works unchanged), `CORS_ORIGINS`. Frontend: `VITE_API_URL=https://<api>.onrender.com/api`. Health check: `/health` (never depends on YouTube or Redis). `/ready` reports Redis + storage.

## Split topology (paid plans)
1. Create an S3-compatible bucket (R2/B2/S3). Set on **every** service: `STORAGE_BACKEND=s3`, `S3_BUCKET`, `S3_ENDPOINT_URL`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
2. **API** web service: `dockerCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT` (no embedded worker).
3. **YouTube worker** (`type: worker`): `./worker_entrypoint.sh`, `CELERY_QUEUES=youtube_ingestion`, `CELERY_CONCURRENCY=1`. Keep at 1 instance unless you have multiple egress IPs. Add `BGUTIL_BASE_URL` / `YTDLP_PROXY`.
4. **Processing worker**: `CELERY_QUEUES=video_processing,embeddings,ai_tasks,reports`, concurrency 2 (memory-hungry because of torch + sentence-transformers; measure and size accordingly).
5. **bgutil** private service from image `brainicism/bgutil-ytdlp-pot-provider` (port 4416). Pin the tag to match the plugin.
The commented blocks in `render.yaml` show this layout. Counts/concurrency are env-configurable; the Redis-side gate keeps YouTube politeness correct no matter how many workers run.

## Operational notes
- `broker_visibility_timeout` (2 h) must exceed task time limits (ingest ≈16 min, process ≈57 min); changing limits means changing it.
- Free instances sleep; a sleeping API doesn't lose jobs (state is in Redis) but a sleeping *embedded worker* stops processing until woken.
- Not verified here: the Docker image build and an actual Render deploy.
