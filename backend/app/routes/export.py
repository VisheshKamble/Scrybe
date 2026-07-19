import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from weasyprint import HTML

router = APIRouter(prefix="/export", tags=["export"])
REPORT_DIR = Path("data/reports")
EXPORT_DIR = Path("data/exports")
EXPORT_DIR.mkdir(parents=True, exist_ok=True)


def _load_report(video_id: str) -> dict:
    path = REPORT_DIR / f"{video_id}.json"
    if not path.exists():
        raise HTTPException(404, "Report not found -- has this video finished processing?")
    return json.loads(path.read_text())


def _report_to_html(report: dict) -> str:
    chapters_html = "".join(
        f"<li><strong>{c['title']}</strong> "
        f"({c['start_seconds']:.0f}s\u2013{c['end_seconds']:.0f}s)"
        f"<p>{c['summary']}</p></li>"
        for c in report["chapters"]
    )
    claims_html = "".join(
        f"<li>{c['text']} \u2014 <em>{'verified' if c['verified'] else 'unverified'}</em></li>"
        for c in report["claims"]
    )
    return (
        f"<html><body>"
        f"<h1>Video report \u2014 {report['video_id']}</h1>"
        f"<h2>Summary</h2><p>{report['summary']}</p>"
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
    report = _load_report(video_id)
    html = _report_to_html(report)
    path = EXPORT_DIR / f"{video_id}.pdf"
    HTML(string=html).write_pdf(str(path))
    return FileResponse(path, filename=f"{video_id}-report.pdf", media_type="application/pdf")
