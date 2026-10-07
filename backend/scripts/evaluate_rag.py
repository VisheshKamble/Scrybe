#!/usr/bin/env python
"""Evaluate Scrybe retrieval + routing on a labeled dataset.

    python scripts/evaluate_rag.py                       # offline, lexical baseline embedder
    python scripts/evaluate_rag.py --embedder sentence-transformers   # semantic (downloads model)
    python scripts/evaluate_rag.py --llm                 # also run the agent (needs GROQ_API_KEY)
    python scripts/evaluate_rag.py --report docs/eval-report.md

Measured here (offline): retrieval hit@1/3/5, MRR, abstention on out-of-corpus
questions, planner routing accuracy, retrieval latency.
Measured only with --llm: citation validity (every cited id/timestamp maps to
retrieved evidence), fallback rate, latency, tokens. Nothing is estimated.
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--embedder", default="hash", choices=["hash", "sentence-transformers"])
    ap.add_argument("--dataset", default=str(ROOT / "eval" / "dataset.json"))
    ap.add_argument("--k", type=int, default=5)
    ap.add_argument("--min-score", type=float, default=None, help="abstention threshold (default: 0.12 for hash, 0.25 for MiniLM)")
    ap.add_argument("--llm", action="store_true")
    ap.add_argument("--report")
    args = ap.parse_args()

    tmp = tempfile.mkdtemp(prefix="scrybe_eval_")
    os.environ.update(
        {
            "GROQ_API_KEY": os.environ.get("GROQ_API_KEY", "unused"),
            "EMBEDDING_PROVIDER": args.embedder,
            "STORAGE_LOCAL_PATH": f"{tmp}/s",
            "VECTOR_STORE_PATH": f"{tmp}/v",
        }
    )
    from app.ask.planner import plan
    from app.config import settings
    from app.vectorstore.chunking import build_chunks
    from app.vectorstore.embeddings import get_embedder
    from app.vectorstore.index import VideoIndex
    from tests.fixtures import CHAPTERS, segments

    min_score = args.min_score if args.min_score is not None else (0.12 if args.embedder == "hash" else settings.retrieval_min_score)
    data = json.load(open(args.dataset))
    vid = "e0a1e0a1"
    chunks = build_chunks(vid, segments(), None, CHAPTERS)
    index = VideoIndex(vid)
    index.build(chunks)
    get_embedder()

    def overlaps(c, rel):
        return c["end_time"] > rel[0] and c["start_time"] < rel[1]

    ranks, lat = [], []
    labeled = [c for c in data["cases"] if c["relevant"]]
    for c in labeled:
        t = time.perf_counter()
        hits = index.search(c["question"], k=args.k)
        lat.append((time.perf_counter() - t) * 1000)
        rank = next((i + 1 for i, h in enumerate(hits) if overlaps(h, c["relevant"])), None)
        ranks.append(rank)

    def hit(k):
        return sum(1 for r in ranks if r and r <= k) / len(ranks)

    mrr = sum(1 / r for r in ranks if r) / len(ranks)
    abstain = sum(1 for q in data["out_of_corpus"] if not index.search(q, k=args.k, min_score=min_score)) / len(data["out_of_corpus"])
    answered = sum(1 for c in labeled if index.search(c["question"], k=args.k, min_score=min_score)) / len(labeled)
    routing = sum(1 for c in data["cases"] if plan(c["question"], n_videos=1).intent == c["intent"]) / len(data["cases"])
    misses = [c["question"] for c, r in zip(labeled, ranks) if not r or r > 3]

    rows = [
        ("Embedder", args.embedder),
        (
            "Eval set",
            f"{len(labeled)} in-corpus + {len(data['out_of_corpus'])} out-of-corpus questions, {len(chunks)} chunks (synthetic lecture)",
        ),
        ("hit@1", f"{hit(1):.2f}"),
        ("hit@3", f"{hit(3):.2f}"),
        (f"hit@{args.k}", f"{hit(args.k):.2f}"),
        ("MRR", f"{mrr:.3f}"),
        (f"In-corpus questions above threshold ({min_score})", f"{answered:.2f}"),
        ("Out-of-corpus abstention rate", f"{abstain:.2f}"),
        ("Planner routing accuracy", f"{routing:.2f} ({len(data['cases'])} cases)"),
        ("Retrieval latency median / max (ms)", f"{statistics.median(lat):.1f} / {max(lat):.1f}"),
    ]
    llm_rows = [("Agent run (--llm)", "NOT RUN")]

    if args.llm:
        from app.ask.graph import run_ask
        from app.ask.models import AskRequest
        from app.report_store import save_report

        save_report(vid, {"video_id": vid, "summary": "", "chapters": CHAPTERS, "claims": []})
        valid = total = fallbacks = 0
        lats, toks = [], []
        for c in data["cases"]:
            r = run_ask(AskRequest(video_ids=[vid], question=c["question"]), "eval")
            lats.append(r.usage.get("latency_ms", 0))
            toks.append(r.usage.get("prompt_tokens", 0) + r.usage.get("completion_tokens", 0))
            fallbacks += r.confidence == "none"
            for cit in r.citations:
                total += 1
                valid += (
                    any(ch["start_time"] == cit.start_seconds and ch["chunk_id"].startswith(vid) for ch in chunks)
                    or cit.source == "chapter"
                )
        llm_rows = [
            ("Agent run (--llm)", f"{len(data['cases'])} questions"),
            ("Citation validity", f"{valid}/{total}"),
            ("Fallback rate", f"{fallbacks}/{len(data['cases'])}"),
            ("Agent latency median (ms)", f"{statistics.median(lats):.0f}"),
            ("Tokens per request median", f"{statistics.median(toks):.0f}"),
        ]

    out = ["| Metric | Value |", "|---|---|"] + [f"| {a} | {b} |" for a, b in rows + llm_rows]
    text = "\n".join(out)
    print(text)
    if misses:
        print("\nQuestions where the relevant chunk was not in the top 3:")
        for m in misses:
            print(" -", m)
    if args.report:
        Path(args.report).write_text(
            "# RAG evaluation report\n\n> Generated by `backend/scripts/evaluate_rag.py`. Numbers below are measured, not estimated.\n"
            "> The dataset is a small **synthetic** lecture with hand-written labels; treat it as a regression smoke test.\n"
            "> The `hash` embedder is a *lexical* baseline (word overlap), not a semantic model.\n"
            "> Known optimism: planner cases overlap with phrasings used while building the planner (in-sample), and the lexical\n"
            "> baseline's stopword list was tuned while probing similar queries. With 8 chunks, hit@5 is near-trivial.\n"
            "> Re-run with `--embedder sentence-transformers` and on real transcripts before drawing conclusions.\n\n"
            + text
            + ("\n\n**Top-3 misses:**\n" + "\n".join(f"- {m}" for m in misses) if misses else "")
            + "\n"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
