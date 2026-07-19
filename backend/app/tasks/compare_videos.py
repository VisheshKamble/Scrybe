from celery import chord
from groq import Groq

from app.celery_app import celery_app
from app.config import settings
from app.tasks.process_video import process_video_task

client = Groq(api_key=settings.groq_api_key)


@celery_app.task
def combine_video_reports(reports: list[dict], focus: str | None = None) -> dict:
    focus_line = f" Focus the comparison on: {focus}." if focus else ""
    prompt = (
        "Compare how these videos cover their subject matter."
        f"{focus_line} Note agreements, contradictions, and unique points "
        "each video makes that the others don't.\n\n"
        + "\n\n".join(
            f"VIDEO {i + 1} SUMMARY:\n{r['summary']}" for i, r in enumerate(reports)
        )
    )
    response = client.chat.completions.create(
        model=settings.model_reasoning,
        messages=[{"role": "user", "content": prompt}],
    )
    return {"videos": reports, "comparison": response.choices[0].message.content}


def dispatch_comparison(youtube_urls: list[str], focus: str | None = None):
    """Fans one Celery task out per video (they process in parallel), then
    fans back in to a single synthesis step once all of them finish.
    """
    workflow = chord(
        (process_video_task.s(url) for url in youtube_urls),
        combine_video_reports.s(focus=focus),
    )
    return workflow()
