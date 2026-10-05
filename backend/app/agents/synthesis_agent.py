import json
import time

import groq
from groq import Groq

from app.agents.retry_utils import call_with_retries
from app.agents.text_utils import condense_if_long
from app.config import settings
from app.streaming import publish_done, publish_token

client = Groq(api_key=settings.groq_api_key)


def extract_claims(transcript: str) -> list[dict]:
    response = call_with_retries(
        client.chat.completions.create,
        model=settings.model_reasoning,
        messages=[{
            "role": "user",
            "content": (
                "Extract up to 6 specific, checkable factual claims from this "
                "video transcript. Return strict JSON of the shape "
                '{"claims": [{"text": str, "timestamp_seconds": number}]}.'
                f"\n\n{transcript}"
            ),
        }],
        response_format={"type": "json_object"},
    )
    parsed = json.loads(response.choices[0].message.content)
    claims = parsed.get("claims", []) if isinstance(parsed, dict) else []
    return claims if isinstance(claims, list) else []


def fact_check_claim(claim_text: str) -> dict:
    """Uses Groq's Compound system -- it has web search built into the
    model call itself, so this needs no separate search API or key.

    Compound's internal search/browsing tokens don't show up in the prompt
    you sent but do count against the account's tokens-per-minute budget,
    so a run of several fact-checks back to back can trip a 413 even
    though each individual request is tiny. call_with_retries absorbs
    that with backoff; if it's still failing after retries, this claim is
    reported as unverifiable instead of taking down the whole video --
    the transcript, chapters, and every other claim already succeeded and
    shouldn't be thrown away over one fact-check.
    """
    try:
        response = call_with_retries(
            client.chat.completions.create,
            model=settings.model_factcheck,
            messages=[{
                "role": "user",
                "content": (
                    f'Fact-check this claim using web search: "{claim_text}". '
                    "Reply with VERIFIED, DISPUTED, or UNVERIFIABLE on the "
                    "first word, then one sentence explaining why."
                ),
            }],
        )
    except groq.APIStatusError as exc:
        return {
            "verified": False,
            "note": f"Fact-check unavailable ({exc.status_code}): couldn't reach the fact-checker in time.",
        }
    text = response.choices[0].message.content
    verified = text.strip().upper().startswith("VERIFIED")
    return {"verified": verified, "note": text}


def run_synthesis_agent(state: dict) -> dict:
    # A multi-hour transcript is condensed first so it doesn't hit the same
    # "payload too large" class of failure here that raw audio hits at the
    # Whisper step -- just manifesting as a context-length error instead of
    # an HTTP 413. Short/typical transcripts pass through unchanged.
    source_text = condense_if_long(state["transcript"], settings.model_fast)

    try:
        claims = extract_claims(source_text)
    except (groq.APIStatusError, json.JSONDecodeError) as exc:
        # Same reasoning as the chapter fallback in segmentation_agent.py:
        # claims are a nice-to-have on top of the transcript and summary,
        # not something worth losing the whole report over if JSON mode
        # keeps failing even after retries.
        state.setdefault("errors", []).append(f"synthesis_agent.extract_claims: {exc}")
        claims = []

    # response_format={"type": "json_object"} guarantees valid JSON, not
    # that every object in "claims" actually has the fields asked for --
    # a model occasionally omits one under json mode. Dropping those here
    # (rather than indexing claim["text"] directly below) means one
    # malformed claim can't crash the task after the transcript, chapters,
    # and every other claim already succeeded.
    claims = [c for c in claims if isinstance(c, dict) and c.get("text")]

    for i, claim in enumerate(claims):
        # A small gap between compound calls, not just backoff after the
        # fact -- spreads token usage out instead of bursting it, which is
        # what trips the tokens-per-minute limit in the first place on
        # tighter (e.g. free-tier) accounts.
        if i > 0:
            time.sleep(settings.factcheck_call_spacing_seconds)
        check = fact_check_claim(claim["text"])
        claim["verified"] = check["verified"]
        claim["verification_note"] = check["note"]
    state["claims"] = claims

    # Stream the summary token-by-token, publishing each token to Redis so
    # the SSE endpoint can relay it to the browser in real time even though
    # this whole agent is running inside a Celery worker, not a request.
    stream = call_with_retries(
        client.chat.completions.create,
        model=settings.model_reasoning,
        messages=[{
            "role": "user",
            "content": (
                "Write a detailed, well-organized summary (5-8 sentences) of "
                f"this video for someone who hasn't watched it:\n\n{source_text}"
            ),
        }],
        stream=True,
    )
    full_summary = ""
    for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            full_summary += delta
            publish_token(state["video_id"], delta)
    publish_done(state["video_id"])

    state["summary"] = full_summary
    return state
