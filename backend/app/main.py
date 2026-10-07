import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.errors import ErrorCode, ScrybeError
from app.routes import compare, export, qa, quiz, stream, videos

logging.basicConfig(level=logging.INFO, format="%(message)s")
app = FastAPI(title="Scrybe -- open-source agentic knowledge layer for long-form video")

app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins_list, allow_methods=["*"], allow_headers=["*"])

for r in (videos.router, stream.router, qa.router, compare.router, export.router, quiz.router):
    app.include_router(r, prefix="/api")


@app.exception_handler(ScrybeError)
async def scrybe_error_handler(_: Request, exc: ScrybeError):
    # `detail` (string) keeps older frontends working; `error` is the structured form.
    headers = {"Retry-After": str(exc.retry_after)} if getattr(exc, "retry_after", None) else None
    logging.getLogger("scrybe").warning("api_error %s: %s", exc.code.value, exc.technical_message)
    return JSONResponse(status_code=exc.http_status, content={"detail": exc.user_message, "error": exc.to_dict()}, headers=headers)


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    logging.getLogger("scrybe").exception("unhandled error")  # traceback to logs only
    err = ScrybeError(ErrorCode.INTERNAL_ERROR, type(exc).__name__)
    return JSONResponse(status_code=500, content={"detail": err.user_message, "error": err.to_dict()})


@app.get("/health")
def health():
    """Liveness only. Never touches Redis, storage or YouTube."""
    return {"status": "ok"}


@app.get("/ready")
def ready():
    """Readiness: can this instance serve requests (Redis + storage)? YouTube
    availability is deliberately NOT part of this."""
    checks = {}
    try:
        from app.redis_client import get_redis

        get_redis().ping()
        checks["redis"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["redis"] = f"error: {type(exc).__name__}"
    try:
        from app.storage import get_storage

        get_storage().exists("healthcheck/none")
        checks["storage"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["storage"] = f"error: {type(exc).__name__}"
    ok = all(v == "ok" for v in checks.values())
    return JSONResponse(status_code=200 if ok else 503, content={"status": "ready" if ok else "degraded", "checks": checks})
