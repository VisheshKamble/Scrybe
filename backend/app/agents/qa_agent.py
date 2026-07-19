from groq import Groq

from app.config import settings
from app.vectorstore.index import VideoIndex

client = Groq(api_key=settings.groq_api_key)


def answer_question(video_id: str, question: str) -> dict:
    index = VideoIndex(video_id)
    matches = index.search(question, k=5)

    context = "\n".join(
        f"[{m['timestamp_seconds']:.0f}s, {m['source']}] {m['text']}" for m in matches
    )

    response = client.chat.completions.create(
        model=settings.model_reasoning,
        messages=[{
            "role": "user",
            "content": (
                "Answer the question using only the context below -- it "
                "mixes transcript lines and visual-frame descriptions, each "
                "tagged with a timestamp. Cite the single most relevant "
                "timestamp in seconds.\n\n"
                f"CONTEXT:\n{context}\n\nQUESTION: {question}"
            ),
        }],
    )

    return {
        "answer": response.choices[0].message.content,
        "timestamp_seconds": matches[0]["timestamp_seconds"] if matches else None,
        "source_snippets": [m["text"] for m in matches],
    }
