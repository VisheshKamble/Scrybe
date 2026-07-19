import json

from groq import Groq

from app.config import settings
from app.streaming import publish_done, publish_token

client = Groq(api_key=settings.groq_api_key)


def extract_claims(transcript: str) -> list[dict]:
    response = client.chat.completions.create(
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
    return parsed.get("claims", [])


def fact_check_claim(claim_text: str) -> dict:
    """Uses Groq's Compound system -- it has web search built into the
    model call itself, so this needs no separate search API or key.
    """
    response = client.chat.completions.create(
        model=settings.model_factcheck,
        messages=[{
            "role": "user",
            "content": (
                f'Fact-check this claim using web search: "{claim_text}". '
                "Reply with VERIFIED, DISPUTED, or UNVERIFIABLE on the first "
                "word, then one sentence explaining why."
            ),
        }],
    )
    text = response.choices[0].message.content
    verified = text.strip().upper().startswith("VERIFIED")
    return {"verified": verified, "note": text}


def run_synthesis_agent(state: dict) -> dict:
    claims = extract_claims(state["transcript"])
    for claim in claims:
        check = fact_check_claim(claim["text"])
        claim["verified"] = check["verified"]
        claim["verification_note"] = check["note"]
    state["claims"] = claims

    # Stream the summary token-by-token, publishing each token to Redis so
    # the SSE endpoint can relay it to the browser in real time even though
    # this whole agent is running inside a Celery worker, not a request.
    stream = client.chat.completions.create(
        model=settings.model_reasoning,
        messages=[{
            "role": "user",
            "content": (
                "Write a detailed, well-organized summary (5-8 sentences) of "
                f"this video for someone who hasn't watched it:\n\n{state['transcript']}"
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
