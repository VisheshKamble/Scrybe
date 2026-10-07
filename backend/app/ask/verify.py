"""Post-generation checks. Everything here is deterministic and cheap.

What is verified: ids and timestamps refer to retrieved evidence; the answer's
content words are mostly present in the cited evidence (lexical grounding
heuristic). What is NOT verified: semantic entailment -- a paraphrase that
changes meaning can pass. Optional LLM-based entailment is a documented
extension point."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.ask.prompts import fmt_ts

_MARK = re.compile(r"\[(E\d+)\]")
_RAW_TS = re.compile(r"\[(?:\d{1,2}:)?\d{1,2}:\d{2}\]")
_STOP = set(
    """about above after again against also because been before being between both could does doing down during each
from further have having here into just more most only other over same should some such than that their them then there these
they this those through under until very were what when where which while will with would your video speaker say says said""".split()
)


@dataclass
class VerifyResult:
    valid_ids: list[str] = field(default_factory=list)
    invalid_ids: list[str] = field(default_factory=list)
    grounding: float = 1.0
    notes: list[str] = field(default_factory=list)
    answer_text: str = ""


def content_words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z][a-z0-9]{3,}", text.lower()) if w not in _STOP}


def grounding_score(answer: str, evidence_texts: list[str]) -> float:
    words = content_words(_MARK.sub("", answer))
    if not words:
        return 1.0
    ev = set().union(*(content_words(t) for t in evidence_texts)) if evidence_texts else set()
    return len(words & ev) / len(words)


def verify_answer(answer: str, claimed_ids: list[str], evidence: list[dict]) -> VerifyResult:
    by_id = {e["evidence_id"]: e for e in evidence}
    res = VerifyResult()
    markers = list(dict.fromkeys(_MARK.findall(answer) + list(claimed_ids or [])))
    res.valid_ids = [m for m in markers if m in by_id]
    res.invalid_ids = [m for m in markers if m not in by_id]
    if res.invalid_ids:
        res.notes.append(f"dropped unknown citations: {', '.join(res.invalid_ids)}")

    text = answer
    for bad in res.invalid_ids:
        text = text.replace(f"[{bad}]", "")
    if _RAW_TS.search(text):  # model-written timestamps are never trusted
        text = _RAW_TS.sub("", text)
        res.notes.append("removed model-written timestamps")
    res.answer_text = re.sub(r"[ \t]{2,}", " ", text).strip()
    res.grounding = grounding_score(res.answer_text, [by_id[i]["text"] for i in res.valid_ids])
    return res


def render_markers(answer: str, evidence: list[dict], multi_video: bool, video_order: list[str]) -> str:
    """[E3] -> [12:31] (or [V2 12:31] for multi-video) so what the user sees is
    always derived from retrieved metadata, never model text."""
    by_id = {e["evidence_id"]: e for e in evidence}

    def sub(m):
        e = by_id.get(m.group(1))
        if not e:
            return ""
        ts = fmt_ts(e["start_time"])
        if multi_video:
            return f"[V{video_order.index(e['video_id']) + 1} {ts}]"
        return f"[{ts}]"

    return _MARK.sub(sub, answer)
