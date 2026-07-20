import base64

from groq import Groq

from app.agents.retry_utils import call_with_retries
from app.config import settings

client = Groq(api_key=settings.groq_api_key)


def _encode_image(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def describe_keyframe(image_path: str) -> str:
    """This is the differentiator: understanding what's actually on
    screen (charts, code, slides, on-screen text), not just the audio.
    """
    encoded = _encode_image(image_path)
    response = call_with_retries(
        client.chat.completions.create,
        model=settings.model_vision,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": (
                    "Describe what's visible in this video frame in 2-3 "
                    "sentences: on-screen text, charts, code, UI, people, "
                    "or actions. Be specific, not generic."
                )},
                {"type": "image_url", "image_url": {
                    "url": f"data:image/jpeg;base64,{encoded}"
                }},
            ],
        }],
    )
    return response.choices[0].message.content


def run_visual_agent(state: dict) -> dict:
    descriptions = []
    for frame in state.get("keyframes", []):
        try:
            desc = describe_keyframe(frame["image_path"])
        except Exception as exc:
            # Don't let one bad frame kill the whole pipeline.
            desc = None
            state.setdefault("errors", []).append(f"visual_agent: {exc}")
        descriptions.append({
            "timestamp_seconds": frame["timestamp_seconds"],
            "description": desc,
        })
    state["visual_descriptions"] = descriptions
    return state
