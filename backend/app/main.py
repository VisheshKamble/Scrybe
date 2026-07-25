from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import videos, stream, qa, compare, export

app = FastAPI(title="Scrybe -- Agentic Video Intelligence")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videos.router, prefix="/api")
app.include_router(stream.router, prefix="/api")
app.include_router(qa.router, prefix="/api")
app.include_router(compare.router, prefix="/api")
app.include_router(export.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
