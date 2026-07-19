import re

from groq import Groq

from app.config import settings

client = Groq(api_key=settings.groq_api_key)


def parse_srt(path: str) -> list[dict]:
    """Small SRT parser -> [{start, end, text}], used when YouTube's
    auto-captions were available so we skip the Whisper call entirely.
    """
    raw = open(path, encoding="utf-8").read()
    blocks = re.split(r"\n\n+", raw.strip())
    segments = []
    for block in blocks:
        lines = block.splitlines()
        if len(lines) < 3:
            continue
        start_str, end_str = [t.strip() for t in lines[1].split("-->")]
        text = " ".join(lines[2:])
        segments.append({
            "start": _srt_time_to_seconds(start_str),
            "end": _srt_time_to_seconds(end_str),
            "text": text,
        })
    return segments


def _srt_time_to_seconds(t: str) -> float:
    h, m, rest = t.split(":")
    s, ms = rest.split(",")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def transcribe_with_whisper(audio_path: str) -> list[dict]:
    """Fallback for videos with no captions available."""
    with open(audio_path, "rb") as f:
        response = client.audio.transcriptions.create(
            file=f,
            model=settings.model_asr,
            response_format="verbose_json",
        )
    return [
        {"start": seg["start"], "end": seg["end"], "text": seg["text"]}
        for seg in response.segments
    ]


def run_transcript_agent(state: dict) -> dict:
    if state.get("caption_path"):
        segments = parse_srt(state["caption_path"])
    else:
        segments = transcribe_with_whisper(state["audio_path"])

    state["transcript_segments"] = segments
    state["transcript"] = " ".join(s["text"] for s in segments)
    return state
