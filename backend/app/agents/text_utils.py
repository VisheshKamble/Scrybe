"""Keeps chat-model prompts a safe size regardless of source video length.

A 5-hour video's transcript can run past 200k characters -- far past what's
safe to send in a single prompt (context-window limits, and Groq enforces
its own per-request size caps the same way it does for audio uploads, just
less visibly). Long transcripts are condensed via a quick map-reduce pass
first instead of being sent raw or silently truncated, which would just
drop everything after the cutoff instead of covering the whole video.
"""

from groq import Groq

from app.agents.retry_utils import call_with_retries
from app.config import settings

_client = Groq(api_key=settings.groq_api_key, max_retries=5, timeout=300.0)


def _chunk_by_chars(text: str, chunk_chars: int) -> list[str]:
    """Splits on word boundaries into pieces of roughly `chunk_chars`."""
    words = text.split()
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0
    for word in words:
        current.append(word)
        current_len += len(word) + 1
        if current_len >= chunk_chars:
            chunks.append(" ".join(current))
            current, current_len = [], 0
    if current:
        chunks.append(" ".join(current))
    return chunks


def condense_if_long(text: str, model: str) -> str:
    """Returns `text` unchanged if it's already a safe size. Otherwise
    summarizes it chunk by chunk and joins the results into a shorter
    digest that still covers the entire transcript, not just the start of
    it, and hands that to the caller instead.
    """
    if len(text) <= settings.transcript_direct_char_limit:
        return text

    chunks = _chunk_by_chars(text, settings.transcript_condense_chunk_chars)
    summaries = []
    for chunk in chunks:
        response = call_with_retries(
            _client.chat.completions.create,
            model=model,
            messages=[{
                "role": "user",
                "content": (
                    "Condense this excerpt from a longer video transcript "
                    "into 3-4 sentences. Keep specific facts, numbers, "
                    "names, and claims; drop filler and repetition.\n\n"
                    f"{chunk}"
                ),
            }],
        )
        summaries.append(response.choices[0].message.content)

    return "\n\n".join(summaries)
