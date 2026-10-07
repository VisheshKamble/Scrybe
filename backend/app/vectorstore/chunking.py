"""Turn raw caption/Whisper segments into retrievable chunks.

Raw segments are 2-6 second fragments (auto-captions even repeat themselves in
rolling windows). Embedding them one-by-one gives noisy, context-free hits, so
they are merged into ~40s windows that keep start/end times and chapter."""

from __future__ import annotations

from app.config import settings


def _dedupe(segments: list[dict]) -> list[dict]:
    out: list[dict] = []
    for s in segments:
        text = " ".join(str(s.get("text", "")).split())
        if not text:
            continue
        if out:
            prev = out[-1]["text"]
            if text == prev or text in prev:
                continue
            if text.startswith(prev):  # rolling caption: new line extends the old
                out[-1] = {**s, "text": text, "start": out[-1]["start"]}
                continue
        out.append({**s, "text": text})
    return out


def _chapter_for(t: float, chapters: list[dict]) -> str | None:
    for c in chapters or []:
        if c.get("start_seconds", 0) <= t < c.get("end_seconds", 0) or (c.get("start_seconds") == 0 and c.get("end_seconds", 0) == 0):
            return c.get("title")
    return None


def build_chunks(video_id: str, segments: list[dict], visuals: list[dict] | None = None, chapters: list[dict] | None = None) -> list[dict]:
    segs = _dedupe(segments)
    chunks: list[dict] = []

    def flush(buf: list[dict]):
        if not buf:
            return
        start, end = float(buf[0]["start"]), float(buf[-1].get("end", buf[-1]["start"]))
        chunks.append(
            {
                "chunk_id": f"{video_id}:{len(chunks)}",
                "video_id": video_id,
                "start_time": start,
                "end_time": max(end, start),
                "timestamp_seconds": start,  # legacy field
                "source": "transcript",
                "chapter": _chapter_for(start, chapters or []),
                "text": " ".join(b["text"] for b in buf),
            }
        )

    buf: list[dict] = []
    chars = 0
    for s in segs:
        buf.append(s)
        chars += len(s["text"]) + 1
        span = float(s.get("end", s["start"])) - float(buf[0]["start"])
        if span >= settings.chunk_target_seconds or chars >= settings.chunk_max_chars:
            flush(buf)
            buf, chars = [], 0
    flush(buf)

    for v in visuals or []:
        if v.get("description"):
            t = float(v["timestamp_seconds"])
            chunks.append(
                {
                    "chunk_id": f"{video_id}:{len(chunks)}",
                    "video_id": video_id,
                    "start_time": t,
                    "end_time": t,
                    "timestamp_seconds": t,
                    "source": "visual",
                    "chapter": _chapter_for(t, chapters or []),
                    "text": v["description"],
                }
            )
    return chunks
