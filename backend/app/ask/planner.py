"""Deterministic intent planner. Rule-based on purpose: free, instant, and
debuggable. It decides intent, whether retrieval is needed, and extracts
parameters (level, #days, #questions, timestamp focus). An LLM planner can be
swapped in behind `plan()` without touching the graph."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

_NUM_WORDS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "a week": 7,
    "week": 7,
}
_TS = re.compile(r"\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b")
_MIN = re.compile(r"\b(?:minute|min)\s+(\d{1,3})\b|\b(?:around|at|near)\s+(\d{1,3})\s*(?:min|minutes)\b", re.I)


@dataclass
class Plan:
    intent: str = "answer"  # answer | teach | quiz | study_plan | compare
    needs_retrieval: bool = True
    level: str | None = None
    n_items: int | None = None
    focus_seconds: float | None = None
    difficulty: str | None = None
    reasons: list[str] = field(default_factory=list)


def _count(text: str, noun: str) -> int | None:
    m = re.search(rf"(\d+|{'|'.join(_NUM_WORDS)})\s+(?:\w+\s+)?{noun}", text)
    if not m:
        return None
    tok = m.group(1)
    return int(tok) if tok.isdigit() else _NUM_WORDS.get(tok)


def parse_focus_seconds(text: str) -> float | None:
    m = _TS.search(text)
    if m:
        h, mi, s = m.groups()
        return int(h or 0) * 3600 + int(mi) * 60 + int(s)
    m = _MIN.search(text)
    if m:
        return int(m.group(1) or m.group(2)) * 60.0
    return None


def plan(question: str, *, n_videos: int = 1, mode: str = "auto", level: str | None = None) -> Plan:
    q = question.lower()
    p = Plan(level=level)
    p.focus_seconds = parse_focus_seconds(q)
    if "beginner" in q or "like i'm 5" in q or "eli5" in q or "simple terms" in q:
        p.level = "beginner"
    elif "interview" in q:
        p.level = p.level or "interview"
    elif "advanced" in q or "in depth" in q:
        p.level = "advanced"
    for d in ("easy", "medium", "hard", "difficult"):
        if d in q:
            p.difficulty = "hard" if d == "difficult" else d

    if mode != "auto":
        p.intent = mode
        p.reasons.append("explicit mode")
    elif re.search(
        r"\bquiz\b|\bquestions? (?:based|about|on)\b|\b(?:give|generate|make|write) (?:me )?(?:\w+ )?(?:\w+ )?(?:mcq|questions|flashcards)",
        q,
    ):
        p.intent = "quiz"
    elif re.search(r"study plan|\b\d+\s*days?\b.*\blearn|\bhave (?:\w+ )?days?\b|learning plan|schedule", q) or re.search(
        r"(?:i have|in) (?:\w+) days? to", q
    ):
        p.intent = "study_plan"
    elif n_videos > 1 and re.search(r"compar|differ|contrast|agree|disagree|collectively|versus|\bvs\b", q):
        p.intent = "compare"
    elif re.search(r"\bteach me\b|\bexplain\b|\bwalk me through\b|\blike i'?m\b|\bhelp me understand\b", q):
        p.intent = "teach"
    else:
        p.intent = "answer"
    p.reasons.append(f"intent={p.intent}")

    if p.intent == "quiz":
        p.n_items = _count(q, r"questions?|mcqs?|flashcards?") or 5
        p.n_items = max(1, min(p.n_items, 10))
    if p.intent == "study_plan":
        p.n_items = _count(q, r"days?") or 3
        p.n_items = max(1, min(p.n_items, 14))
    p.needs_retrieval = p.intent != "study_plan"  # study plans are built from chapter structure
    return p
