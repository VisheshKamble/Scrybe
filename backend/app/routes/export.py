import html
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.errors import ScrybeError
from app.report_store import load_report
from app.validation import is_valid_video_id

router = APIRouter(prefix="/export", tags=["export"])
EXPORT_DIR = Path("data/exports")
EXPORT_DIR.mkdir(parents=True, exist_ok=True)


def _load_report(video_id: str) -> dict:
    # See app/validation.py -- video_id feeds straight into a path below.
    if not is_valid_video_id(video_id):
        raise HTTPException(404, "Report not found -- has this video finished processing?")
    try:
        return load_report(video_id)
    except ScrybeError:
        raise HTTPException(404, "Report not found -- has this video finished processing?") from None


def _report_to_html(report: dict) -> str:
    # report['summary'], chapter titles/summaries, and claim text are all
    # either LLM output derived from the video's transcript or the
    # transcript's own words -- for the kind of coding/tech-tutorial
    # content this app is built around, a claim or chapter title
    # containing something like "the <div> tag" or "using <script>" is a
    # realistic, not hypothetical, occurrence. Without escaping, that text
    # gets parsed as actual markup instead of displayed literally,
    # corrupting the rendered PDF around it.
    e = html.escape
    chapters_html = "".join(
        f"<li><strong>{e(c['title'])}</strong> ({c['start_seconds']:.0f}s\u2013{c['end_seconds']:.0f}s)<p>{e(c['summary'])}</p></li>"
        for c in report["chapters"]
    )
    claims_html = "".join(
        f"<li>{e(c['text'])} \u2014 <em>{'verified' if c['verified'] else 'unverified'}</em></li>" for c in report["claims"]
    )
    return (
        f"<html><body>"
        f"<h1>Video report \u2014 {e(report['video_id'])}</h1>"
        f"<h2>Summary</h2><p>{e(report['summary'])}</p>"
        f"<h2>Chapters</h2><ul>{chapters_html}</ul>"
        f"<h2>Claims</h2><ul>{claims_html}</ul>"
        f"</body></html>"
    )


@router.get("/{video_id}/markdown")
def export_markdown(video_id: str):
    report = _load_report(video_id)
    lines = [f"# Video report -- {video_id}", "", "## Summary", report["summary"], "", "## Chapters"]
    for c in report["chapters"]:
        lines.append(f"- **{c['title']}** ({c['start_seconds']:.0f}s-{c['end_seconds']:.0f}s): {c['summary']}")
    lines.append("\n## Claims")
    for c in report["claims"]:
        status = "verified" if c["verified"] else "unverified"
        lines.append(f"- {c['text']} -- _{status}_")

    path = EXPORT_DIR / f"{video_id}.md"
    path.write_text("\n".join(lines))
    return FileResponse(path, filename=f"{video_id}-report.md")


@router.get("/{video_id}/pdf")
def export_pdf(video_id: str):
    from weasyprint import HTML  # lazy: needs native Pango libs

    report = _load_report(video_id)
    html = _report_to_html(report)
    path = EXPORT_DIR / f"{video_id}.pdf"
    HTML(string=html).write_pdf(str(path))
    return FileResponse(path, filename=f"{video_id}-report.pdf", media_type="application/pdf")
