import json

import groq
from groq import Groq

from app.agents.retry_utils import call_with_retries
from app.config import settings

client = Groq(api_key=settings.groq_api_key)


def _bucket_transcript_lines(segments: list[dict], bucket_seconds: float) -> str:
    """Groups fine-grained segments into fixed-width time buckets. A
    multi-hour video can produce thousands of raw Whisper segments, which
    blows up this prompt the same way an un-chunked audio file blows up
    the Whisper upload -- this keeps the prompt's size proportional to
    video *length* rather than to segment *count*, while still preserving
    a timestamp on every line.
    """
    buckets: dict[float, list[str]] = {}
    for s in segments:
        bucket_start = int(s["start"] // bucket_seconds) * bucket_seconds
        buckets.setdefault(bucket_start, []).append(s["text"])
    return "\n".join(
        f"[{start:.0f}s] {' '.join(texts)}"
        for start, texts in sorted(buckets.items())
    )


def _build_transcript_lines(segments: list[dict]) -> str:
    if len(segments) <= settings.segmentation_max_raw_segments:
        return "\n".join(f"[{s['start']:.0f}s] {s['text']}" for s in segments)
    return _bucket_transcript_lines(segments, settings.segmentation_bucket_seconds)


def _fallback_chapters(state: dict) -> list[dict]:
    """One chapter spanning the whole video. Worse than real chapters, but
    the rest of the report (transcript, claims, summary, keyframes) is
    still perfectly usable -- losing chapter breakdown shouldn't mean
    losing the whole video.
    """
    segments = state.get("transcript_segments", [])
    end_seconds = max((s["end"] for s in segments), default=0.0)
    return [{
        "title": "Full video",
        "start_seconds": 0.0,
        "end_seconds": end_seconds,
        "summary": "Chapter breakdown wasn't available for this video.",
    }]


def run_segmentation_agent(state: dict) -> dict:
    """Uses the cheaper/faster model -- segmentation doesn't need the
    heaviest reasoning model, just consistent structured output.
    """
    transcript_lines = _build_transcript_lines(state["transcript_segments"])
    visual_lines = "\n".join(
        f"[{v['timestamp_seconds']:.0f}s] {v['description']}"
        for v in state.get("visual_descriptions", []) if v["description"]
    )

    prompt = (
        "Split this video into logical chapters based on the transcript and "
        "visual notes below. Return strict JSON of the shape "
        '{"chapters": [{"title": str, "start_seconds": number, '
        '"end_seconds": number, "summary": str}]}.\n\n'
        f"TRANSCRIPT:\n{transcript_lines}\n\nVISUAL NOTES:\n{visual_lines}"
    )

    try:
        response = call_with_retries(
            client.chat.completions.create,
            model=settings.model_fast,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        parsed = json.loads(response.choices[0].message.content)
        chapters = parsed.get("chapters", [])
    except (groq.APIStatusError, json.JSONDecodeError) as exc:
        # Even with retries, JSON mode can keep failing on certain
        # transcripts. Chapters are a nice-to-have, not something worth
        # losing the transcript/claims/summary/keyframes over.
        state.setdefault("errors", []).append(f"segmentation_agent: {exc}")
        chapters = _fallback_chapters(state)

    state["chapters"] = chapters
    return state
