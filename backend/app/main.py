from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import videos, stream, qa, compare, export

app = FastAPI(title="Scrybe -- Agentic Video Intelligence")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videos.router)
app.include_router(stream.router)
app.include_router(qa.router)
app.include_router(compare.router)
app.include_router(export.router)


@app.get("/health")
def health():
    return {"status": "ok"}
