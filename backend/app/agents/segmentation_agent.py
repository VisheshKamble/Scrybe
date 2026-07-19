import json

from groq import Groq

from app.config import settings

client = Groq(api_key=settings.groq_api_key)


def run_segmentation_agent(state: dict) -> dict:
    """Uses the cheaper/faster model -- segmentation doesn't need the
    heaviest reasoning model, just consistent structured output.
    """
    transcript_lines = "\n".join(
        f"[{s['start']:.0f}s] {s['text']}" for s in state["transcript_segments"]
    )
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

    response = client.chat.completions.create(
        model=settings.model_fast,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    parsed = json.loads(response.choices[0].message.content)
    state["chapters"] = parsed.get("chapters", [])
    return state
