"""Ask Scrybe workflow (LangGraph).

    plan -> retrieve -> reason -> verify -> finalize
               |           ^         |
               v           +---------+  (at most ONE revision)
            fallback  <----- any step limit / no evidence / unusable output

Explicit typed state, bounded steps, one revision max, no free-form tool use:
the graph (not the model) decides which tool runs next.
"""

from __future__ import annotations

import json
import re
import time
from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph

from app.ask import cache, prompts, tools, verify
from app.ask.models import AskRequest, AskResponse, Citation
from app.ask.planner import Plan
from app.ask.planner import plan as make_plan
from app.config import settings
from app.errors import ErrorCode, ScrybeError
from app.llm import estimate_cost_usd, get_llm
from app.observability import span

FALLBACK_TEXT = "I couldn't find enough evidence in this video to answer that confidently."


class AskState(TypedDict, total=False):
    req: AskRequest
    request_id: str
    plan: Plan
    evidence: list[dict]
    raw: dict
    revision_hint: Optional[str]
    attempt: int
    steps: int
    deadline: float
    notes: list[str]
    usage: dict
    result: dict
    trace: list
    fallback_reason: Optional[str]


def _tick(state: AskState) -> int:
    return state.get("steps", 0) + 1


def _over_budget(state: AskState) -> bool:
    return state.get("steps", 0) >= settings.agent_max_steps or time.monotonic() > state["deadline"]


def plan_node(state: AskState) -> dict:
    req = state["req"]
    with span("agent", agent="planner") as s:
        p = make_plan(req.question, n_videos=len(req.video_ids), mode=req.mode, level=req.level)
        s["intent"] = p.intent
    return {"plan": p, "steps": _tick(state)}


def _round_robin(chunks: list[dict], video_ids: list[str]) -> list[dict]:
    """Interleave per-video results so the size cap can't drop a whole video."""
    by_vid = {v: [c for c in chunks if c["video_id"] == v] for v in video_ids}
    out: list[dict] = []
    for i in range(max((len(x) for x in by_vid.values()), default=0)):
        out.extend(by_vid[v][i] for v in video_ids if i < len(by_vid[v]))
    return out


def retrieve_node(state: AskState) -> dict:
    req, p = state["req"], state["plan"]
    with span("agent", agent="retriever", intent=p.intent) as s:
        if p.intent == "study_plan":
            evidence = tools.get_chapters_as_evidence(req.video_ids)
        else:
            relaxed = p.intent == "quiz"  # "give me questions" isn't lexically close to any chunk
            k = 12 if relaxed else settings.retrieval_top_k
            chunks = tools.retrieve_chunks(
                tools.RetrieveInput(
                    video_ids=req.video_ids, query=req.question, k=k, min_score=0.0 if relaxed else settings.retrieval_min_score
                )
            )
            if p.focus_seconds is not None:
                for vid in req.video_ids[:1]:
                    chunks = (
                        tools.get_timestamp_context(
                            tools.TimeContextInput(
                                video_id=vid, start_seconds=max(0, p.focus_seconds - 60), end_seconds=p.focus_seconds + 90, limit=4
                            )
                        )
                        + chunks
                    )
            evidence = _round_robin(chunks, req.video_ids) if p.intent == "compare" else chunks
        evidence = tools.select_evidence(evidence)
        s["n_results"] = len(evidence)
        s["chunk_ids"] = [e["chunk_id"] for e in evidence]
    return {"evidence": evidence, "steps": _tick(state)}


def _usage_add(state: AskState, res) -> dict:
    u = dict(state.get("usage") or {})
    u["llm_calls"] = u.get("llm_calls", 0) + 1
    u["prompt_tokens"] = u.get("prompt_tokens", 0) + res.prompt_tokens
    u["completion_tokens"] = u.get("completion_tokens", 0) + res.completion_tokens
    u["model"] = res.model
    cost = estimate_cost_usd(res.model, u["prompt_tokens"], u["completion_tokens"])
    u["est_cost_usd"] = cost  # None unless LLM_PRICES configured
    return u


def _parse_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.M).strip()
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.S)
        if not m:
            raise ScrybeError(ErrorCode.AI_GENERATION_ERROR, "no JSON object in output") from None
        try:
            obj = json.loads(m.group(0))
        except json.JSONDecodeError as exc:
            raise ScrybeError(ErrorCode.AI_GENERATION_ERROR, "invalid JSON") from exc
    if not isinstance(obj, dict):
        raise ScrybeError(ErrorCode.AI_GENERATION_ERROR, "JSON is not an object")
    return obj


def reason_node(state: AskState) -> dict:
    req, p, evidence = state["req"], state["plan"], state["evidence"]
    system = prompts.system_prompt(p, req.length)
    if state.get("revision_hint"):
        system += f"\nREVISION: your previous draft was rejected: {state['revision_hint']} Fix this."
    labels = {v: f"V{i + 1}" for i, v in enumerate(req.video_ids)}
    user = prompts.user_prompt(req.question, evidence, labels)
    with span("agent", agent="reasoner", intent=p.intent, attempt=state.get("attempt", 0)) as s:
        try:
            res = get_llm().complete(
                system=system, user=user, json_mode=True, model=settings.model_fast if p.intent in ("quiz", "study_plan") else None
            )
            raw = _parse_json(res.text)
        except ScrybeError as exc:
            if exc.code == ErrorCode.AI_GENERATION_ERROR:
                return {"fallback_reason": "unusable model output", "steps": _tick(state)}
            raise
        s.update(model=res.model, prompt_tokens=res.prompt_tokens, completion_tokens=res.completion_tokens)
    return {"raw": raw, "usage": _usage_add(state, res), "steps": _tick(state)}


def _cite(e: dict, snippet_len: int = 240) -> Citation:
    return Citation(
        evidence_id=e["evidence_id"],
        video_id=e["video_id"],
        start_seconds=e["start_time"],
        end_seconds=e["end_time"],
        source=e["source"],
        snippet=e["text"][:snippet_len],
        score=e.get("score"),
    )


def verify_node(state: AskState) -> dict:
    p, raw, evidence = state["plan"], state["raw"], state["evidence"]
    by_id = {e["evidence_id"]: e for e in evidence}
    notes = list(state.get("notes") or [])
    with span("agent", agent="verifier", intent=p.intent) as s:
        if raw.get("answerable") is False:
            return {"fallback_reason": "model reported insufficient evidence", "steps": _tick(state)}

        if p.intent == "quiz":
            qs = []
            for q in raw.get("questions", []) if isinstance(raw.get("questions"), list) else []:
                if not isinstance(q, dict) or q.get("evidence") not in by_id or not q.get("question") or not q.get("answer"):
                    continue
                if q.get("type") == "mcq" and not (
                    isinstance(q.get("options"), list) and len(q["options"]) == 4 and q["answer"] in q["options"]
                ):
                    continue
                e = by_id[q["evidence"]]
                qs.append(
                    {
                        **{k: q.get(k) for k in ("type", "question", "options", "answer", "explanation", "difficulty")},
                        "source": {"video_id": e["video_id"], "start_seconds": e["start_time"], "evidence_id": e["evidence_id"]},
                    }
                )
            dropped = (len(raw.get("questions", [])) if isinstance(raw.get("questions"), list) else 0) - len(qs)
            if dropped:
                notes.append(f"dropped {dropped} question(s) that weren't traceable to evidence")
            if not qs:
                return {"fallback_reason": "no traceable questions", "steps": _tick(state)}
            used = [by_id[q["source"]["evidence_id"]] for q in qs]
            return {
                "result": {
                    "answer": f"Generated {len(qs)} question(s) from the video.",
                    "quiz": qs,
                    "cited": used,
                    "confidence": "high",
                    "grounding": 1.0,
                },
                "notes": notes,
                "steps": _tick(state),
            }

        if p.intent == "study_plan":
            days = []
            for d in raw.get("days", []) if isinstance(raw.get("days"), list) else []:
                secs = [x for x in d.get("sections", []) if x in by_id] if isinstance(d, dict) else []
                if not secs:
                    continue
                mins = round(sum(by_id[x]["end_time"] - by_id[x]["start_time"] for x in secs) / 60, 1)
                days.append(
                    {
                        "day": d.get("day"),
                        "title": d.get("title"),
                        "focus": d.get("focus", []),
                        "activities": d.get("activities", []),
                        "watch_minutes": mins,
                        "sections": [
                            {
                                "video_id": by_id[x]["video_id"],
                                "start_seconds": by_id[x]["start_time"],
                                "end_seconds": by_id[x]["end_time"],
                                "title": by_id[x]["text"].split(":")[0],
                                "evidence_id": x,
                            }
                            for x in secs
                        ],
                    }
                )
            if not days:
                return {"fallback_reason": "no plan day referenced real sections", "steps": _tick(state)}
            used = [by_id[s_["evidence_id"]] for d in days for s_ in d["sections"]]
            return {
                "result": {
                    "answer": f"{len(days)}-day plan built from the video's actual sections.",
                    "study_plan": days,
                    "cited": used,
                    "confidence": "medium",
                    "grounding": 1.0,
                },
                "notes": notes,
                "steps": _tick(state),
            }

        if p.intent == "compare":
            return _verify_compare(state, raw, by_id, notes)

        answer = raw.get("answer") if isinstance(raw.get("answer"), str) else ""
        vr = verify.verify_answer(answer, raw.get("citations") or [], evidence)
        s.update(grounding=round(vr.grounding, 3))
        notes += vr.notes
        problem = None
        if not vr.valid_ids:
            problem = "the answer cited no valid evidence ids."
        elif vr.grounding < settings.verify_min_grounding / 2:
            problem = "most claims were not present in the cited evidence."
        if problem:
            if state.get("attempt", 0) < 1:
                return {"revision_hint": problem, "attempt": state.get("attempt", 0) + 1, "notes": notes, "steps": _tick(state)}
            return {"fallback_reason": problem, "notes": notes, "steps": _tick(state)}
        conf = raw.get("confidence") if raw.get("confidence") in ("high", "medium", "low") else "medium"
        if vr.grounding < settings.verify_min_grounding:
            conf = "low"
        elif vr.grounding < 0.6 and conf == "high":
            conf = "medium"
        multi = len(state["req"].video_ids) > 1
        text = verify.render_markers(vr.answer_text, evidence, multi, state["req"].video_ids)
        if conf == "low":
            text = "I'm not fully confident in this answer; check the cited moments.\n\n" + text
        return {
            "result": {"answer": text, "cited": [by_id[i] for i in vr.valid_ids], "confidence": conf, "grounding": vr.grounding},
            "notes": notes,
            "steps": _tick(state),
        }


def _verify_compare(state: AskState, raw: dict, by_id: dict, notes: list[str]) -> dict:
    """An item survives only if it cites real evidence. 'common', 'differences'
    and 'conflicts' are claims *about two videos*, so they must be backed by
    evidence from at least two different videos; otherwise they are demoted to
    'unique' (one-video claims) instead of pretending the videos relate."""
    order = state["req"].video_ids
    out = {"common": [], "differences": [], "unique": [], "conflicts": []}
    cited: list[dict] = []
    demoted = dropped = 0
    for section in out:
        items = raw.get(section)
        for it in items if isinstance(items, list) else []:
            ids = [i for i in (it.get("evidence") or []) if i in by_id] if isinstance(it, dict) else []
            if not ids or not isinstance(it.get("point"), str) or not it["point"].strip():
                dropped += 1
                continue
            target = section
            if section != "unique" and len({by_id[i]["video_id"] for i in ids}) < 2:
                target, demoted = "unique", demoted + 1
            out[target].append(
                {
                    "point": it["point"].strip(),
                    "sources": [
                        {
                            "evidence_id": i,
                            "video_id": by_id[i]["video_id"],
                            "label": f"V{order.index(by_id[i]['video_id']) + 1}",
                            "start_seconds": by_id[i]["start_time"],
                        }
                        for i in dict.fromkeys(ids)
                    ],
                }
            )
            cited += [by_id[i] for i in ids]
    if demoted:
        notes.append(f"{demoted} comparison point(s) cited only one video and were moved to 'unique'")
    if dropped:
        notes.append(f"dropped {dropped} comparison point(s) without valid evidence")
    if not any(out.values()):
        return {"fallback_reason": "no comparison point had valid evidence", "notes": notes, "steps": _tick(state)}
    summary = raw.get("summary") if isinstance(raw.get("summary"), str) else ""
    summary = verify.render_markers(verify.verify_answer(summary, [], list(by_id.values())).answer_text, list(by_id.values()), True, order)
    return {
        "result": {
            "answer": summary or "Comparison built from the retrieved evidence.",
            "comparison": out,
            "cited": cited,
            "confidence": "medium",
            "grounding": 1.0,
        },
        "notes": notes,
        "steps": _tick(state),
    }


def fallback_node(state: AskState) -> dict:
    notes = list(state.get("notes") or [])
    if state.get("fallback_reason"):
        notes.append(f"fallback: {state['fallback_reason']}")
    return {
        "result": {"answer": FALLBACK_TEXT, "cited": [], "confidence": "none", "grounding": None},
        "notes": notes,
        "steps": _tick(state),
    }


# --- routing (pure functions of state; no model decides control flow) ------
def route_after_plan(state: AskState) -> str:
    return "retrieve" if state["plan"].needs_retrieval or state["plan"].intent == "study_plan" else "fallback"


def route_after_retrieve(state: AskState) -> str:
    return "fallback" if not state.get("evidence") or _over_budget(state) else "reason"


def route_after_reason(state: AskState) -> str:
    return "fallback" if state.get("fallback_reason") or _over_budget(state) else "verify"


def route_after_verify(state: AskState) -> str:
    if state.get("result"):
        return END
    if state.get("fallback_reason") or _over_budget(state):
        return "fallback"
    return "reason"  # single revision loop (attempt counter caps it at 1)


def _detail(step: str, merged: dict, out: dict) -> str:
    if step == "plan":
        return f"intent: {merged['plan'].intent}"
    if step == "retrieve":
        ev = merged.get("evidence") or []
        top = max((e.get("score") or 0 for e in ev), default=0)
        return f"{len(ev)} passages, best match {top:.2f}" if ev else "no relevant passages"
    if step == "reason":
        if out.get("fallback_reason"):
            return f"no usable output ({out['fallback_reason']})"
        u = merged.get("usage") or {}
        return f"{u.get('model', 'model')}, {u.get('prompt_tokens', 0)}+{u.get('completion_tokens', 0)} tokens"
    if step == "verify":
        if out.get("result"):
            r = out["result"]
            g = r.get("grounding")
            return f"{r['confidence']} confidence" + (f", grounding {g:.2f}" if isinstance(g, float) else "")
        if out.get("revision_hint"):
            return f"rejected: {out['revision_hint']} Revising once."
        return f"failed: {out.get('fallback_reason', 'unverified')}"
    return merged.get("fallback_reason") or "safe fallback"


def traced(step: str, fn):
    """Record what each step did (never prompt or evidence text) for the UI and logs."""

    def wrapper(state: AskState) -> dict:
        t0 = time.perf_counter()
        out = fn(state)
        entry = {"step": step, "ms": round((time.perf_counter() - t0) * 1000, 1), "detail": _detail(step, {**state, **out}, out)}
        out["trace"] = [*(state.get("trace") or []), entry]
        return out

    return wrapper


def build_graph():
    g = StateGraph(AskState)
    # Node names carry a _step suffix: LangGraph forbids a node named like a state key.
    for name, fn in [
        ("plan_step", plan_node),
        ("retrieve_step", retrieve_node),
        ("reason_step", reason_node),
        ("verify_step", verify_node),
        ("fallback_step", fallback_node),
    ]:
        g.add_node(name, traced(name.removesuffix("_step"), fn))
    g.set_entry_point("plan_step")
    g.add_conditional_edges("plan_step", route_after_plan, {"retrieve": "retrieve_step", "fallback": "fallback_step"})
    g.add_conditional_edges("retrieve_step", route_after_retrieve, {"reason": "reason_step", "fallback": "fallback_step"})
    g.add_conditional_edges("reason_step", route_after_reason, {"verify": "verify_step", "fallback": "fallback_step"})
    g.add_conditional_edges("verify_step", route_after_verify, {END: END, "fallback": "fallback_step", "reason": "reason_step"})
    g.add_edge("fallback_step", END)
    return g.compile()


ask_graph = build_graph()


def run_ask(req: AskRequest, request_id: str) -> AskResponse:
    t0 = time.perf_counter()
    hit = cache.get(req)
    if hit is not None:  # zero LLM calls, zero retrieval
        hit.request_id, hit.cached = request_id, True
        hit.trace = [{"step": "cache", "ms": 0.0, "detail": "identical question answered earlier; no retrieval or LLM call"}]
        hit.usage = {"llm_calls": 0, "prompt_tokens": 0, "completion_tokens": 0, "latency_ms": round((time.perf_counter() - t0) * 1000, 1)}
        return hit
    resp = _run_ask_uncached(req, request_id, t0)
    cache.put(req, resp)
    return resp


def _run_ask_uncached(req: AskRequest, request_id: str, t0: float) -> AskResponse:
    state: AskState = {
        "req": req,
        "request_id": request_id,
        "steps": 0,
        "attempt": 0,
        "notes": [],
        "usage": {},
        "deadline": time.monotonic() + settings.agent_llm_timeout_seconds * 3,
    }
    final = ask_graph.invoke(state, config={"recursion_limit": settings.agent_max_steps * 3 + 5})
    r = final["result"]
    cited = r.get("cited", [])
    seen, citations = set(), []
    for e in cited:
        if e["evidence_id"] not in seen:
            seen.add(e["evidence_id"])
            citations.append(_cite(e))
    usage = dict(final.get("usage") or {})
    usage["latency_ms"] = round((time.perf_counter() - t0) * 1000, 1)
    usage["steps"] = final.get("steps", 0)
    return AskResponse(
        request_id=request_id,
        intent=final["plan"].intent,
        answer=r["answer"],
        confidence=r["confidence"],
        grounded=r["confidence"] in ("high", "medium"),
        citations=citations,
        quiz=r.get("quiz"),
        study_plan=r.get("study_plan"),
        comparison=r.get("comparison"),
        trace=final.get("trace", []),
        notes=final.get("notes", []),
        usage=usage,
        timestamp_seconds=citations[0].start_seconds if citations else None,
        source_snippets=[c.snippet for c in citations],
    )
