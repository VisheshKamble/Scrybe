import glob
import math
import os
import re
import shutil
import subprocess
import tempfile
import uuid

import groq
from groq import Groq

from app.config import settings
from app.ingestion.audio import get_audio_duration_seconds

# max_retries covers transient failures (429 rate limits, 5xx) -- the SDK
# already retries those internally with backoff, so we don't reimplement
# that here. It does NOT retry 413s, which is exactly the error this file
# is built around: that one is a real "your file is too big" problem, not
# a transient one, and needs chunking, not a retry.
client = Groq(api_key=settings.groq_api_key, max_retries=5, timeout=600.0)

# Safety cap on how many times one piece of audio can be re-split if it's
# still too large after being split once. In practice this converges in
# 1-2 levels (see transcribe_with_whisper), so this is only a guard against
# a pathological/corrupt file, not something normal long videos will hit.
# 2**6 = 64-way split ceiling on top of the initial split.
_MAX_SPLIT_DEPTH = 6


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


def _call_whisper(audio_path: str) -> list[dict]:
    with open(audio_path, "rb") as f:
        response = client.audio.transcriptions.create(
            file=f,
            model=settings.model_asr,
            response_format="verbose_json",
        )
    # A chunk that's pure silence can come back with no segments at all --
    # that's a valid result, not an error.
    segments = getattr(response, "segments", None) or []
    return [
        {"start": seg["start"], "end": seg["end"], "text": seg["text"]}
        for seg in segments
    ]


def _offset_segments(segments: list[dict], offset_seconds: float) -> list[dict]:
    if not offset_seconds:
        return segments
    return [
        {**s, "start": s["start"] + offset_seconds, "end": s["end"] + offset_seconds}
        for s in segments
    ]


def _split_into_pieces(audio_path: str, piece_seconds: float, tmp_dir: str) -> list[str]:
    """Splits one audio file into equal-length pieces via ffmpeg's segment
    muxer. Uses `-c copy` (stream copy, no re-encoding) since the source is
    already a low-bitrate mp3 -- this is fast even on a multi-hour file.
    """
    prefix = f"chunk_{uuid.uuid4().hex[:8]}"
    pattern = os.path.join(tmp_dir, f"{prefix}_%05d.mp3")
    try:
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", audio_path,
                "-f", "segment",
                "-segment_time", f"{piece_seconds:.3f}",
                "-c", "copy",
                "-reset_timestamps", "1",
                pattern,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"ffmpeg failed to split '{audio_path}': {exc.stderr}") from exc

    pieces = sorted(glob.glob(os.path.join(tmp_dir, f"{prefix}_*.mp3")))
    if not pieces:
        raise RuntimeError(f"ffmpeg produced no output splitting '{audio_path}'")
    return pieces


def _transcribe_recursive(
    audio_path: str, offset_seconds: float, tmp_dir: str, depth: int = 0
) -> list[dict]:
    """Transcribes one audio file of any size. If it fits under Groq's
    upload limit, it's sent as-is. If not (or if Groq still rejects it as
    413 despite looking small enough), it's split into pieces sized from
    its own *measured* bitrate -- not a guess -- and each piece is
    transcribed recursively, with timestamps corrected back to the
    original timeline. This is what lets a 5-hour video, or a 50-hour one,
    go through exactly the same code path as a 5-minute one.
    """
    size = os.path.getsize(audio_path)

    if size <= settings.groq_audio_max_bytes:
        try:
            return _offset_segments(_call_whisper(audio_path), offset_seconds)
        except groq.APIStatusError as exc:
            if exc.status_code != 413:
                raise
            # Our size check passed but Groq disagreed (container/encoding
            # overhead, or the limit is tighter than documented) -- fall
            # through to splitting instead of failing the whole video.

    if depth >= _MAX_SPLIT_DEPTH:
        raise RuntimeError(
            f"'{audio_path}' ({size / 1024 / 1024:.1f}MB) still exceeds "
            f"Groq's upload limit after {depth} splits -- giving up. This "
            f"points to a corrupt file or an unexpectedly extreme bitrate, "
            f"not just a long video."
        )

    duration = get_audio_duration_seconds(audio_path)
    if duration <= 2.0:
        raise RuntimeError(
            f"'{audio_path}' is too large to upload but too short "
            f"({duration:.1f}s) to split further -- likely a corrupt or "
            f"non-audio file."
        )

    # Size pieces from this file's own measured bytes-per-second, at 85% of
    # the limit to leave headroom for segment-boundary overhead. This keeps
    # the number of API calls close to the minimum needed instead of always
    # bisecting blindly.
    target_bytes = settings.groq_audio_max_bytes * 0.85
    n_pieces = max(2, math.ceil(size / target_bytes))
    piece_seconds = max(5.0, duration / n_pieces)

    piece_paths = _split_into_pieces(audio_path, piece_seconds, tmp_dir)

    all_segments = []
    offset = offset_seconds
    for piece_path in piece_paths:
        piece_duration = get_audio_duration_seconds(piece_path)
        all_segments.extend(
            _transcribe_recursive(piece_path, offset, tmp_dir, depth + 1)
        )
        offset += piece_duration
        try:
            os.remove(piece_path)
        except OSError:
            pass

    return all_segments


def transcribe_with_whisper(audio_path: str) -> list[dict]:
    """Fallback for videos with no captions available. Handles audio of
    any length -- short clips go straight to Groq in one call; anything
    over the upload limit is chunked, transcribed piece by piece, and
    reassembled with corrected timestamps.
    """
    tmp_dir = tempfile.mkdtemp(prefix="scrybe_whisper_")
    try:
        segments = _transcribe_recursive(audio_path, offset_seconds=0.0, tmp_dir=tmp_dir)
        segments.sort(key=lambda s: s["start"])
        return segments
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def run_transcript_agent(state: dict) -> dict:
    if state.get("caption_path"):
        segments = parse_srt(state["caption_path"])
    else:
        segments = transcribe_with_whisper(state["audio_path"])

    state["transcript_segments"] = segments
    state["transcript"] = " ".join(s["text"] for s in segments)
    return state
