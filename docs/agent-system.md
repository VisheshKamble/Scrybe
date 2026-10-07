# Agent system (Ask Scrybe)

`app/ask/graph.py` is a LangGraph state machine. The graph, not the model, decides control flow.

```
plan_step ─▶ retrieve_step ─▶ reason_step ─▶ verify_step ─▶ END
    │              │               │              │
    └──────────────┴───────────────┴──▶ fallback_step ─▶ END
                                   ▲──────────────┘  (one revision, then fallback)
```

| Step | What it does |
|---|---|
| **plan** (`planner.py`) | Rule-based intent: `answer / teach / quiz / study_plan / compare`; extracts level, #questions, #days, difficulty, and timestamps ("around 24:10"). Free, instant, deterministic. Swappable for an LLM planner. |
| **retrieve** (`tools.py`) | Typed, size-limited tools: `retrieve_chunks`, `get_timestamp_context`, `get_video_metadata`, `get_chapters_as_evidence`. Study plans use real chapters; quizzes relax the similarity threshold; timestamp questions fetch that time window. Evidence is deduped, size-capped and given ids `E1..En`. |
| **reason** | One LLM call (JSON mode) with strict role separation (below). Quiz/plan use the fast model. |
| **verify** (`verify.py`) | Drops unknown evidence ids; strips model-written timestamps; computes lexical grounding; quiz questions without a traceable source are dropped; plan sections must map to real chapters and *minutes are computed server-side*. |
| **fallback** | `"I couldn't find enough evidence in this video to answer that confidently."` when there is no evidence, the model says it can't answer, output is unusable, grounding is too low after one revision, or the step/time budget is hit. |

Safety limits: typed inputs (≤5 videos, ≤1000-char question, k ≤ 20), `AGENT_MAX_STEPS`, a wall-clock deadline, a recursion limit, and at most one revision. No shell, Python or network tools exist.

## Trace
Every answer includes `trace`: one entry per step actually run (`plan`, `retrieve`, `reason`, `verify`, revision loop, `fallback` or `cache`) with duration and a one-line detail (intent, passage count and best score, model and token counts, grounding). It never contains prompt, answer or transcript text. The UI renders it as "How Scrybe answered".

## Timestamps
The model cites ids (`[E2]`). The server rewrites them to `[12:31]` (or `[V2 12:31]` for multi-video) *from retrieved chunk metadata*. A timestamp that the model writes itself is removed.

## Prompt boundaries
System message: rules only. User message: `EVIDENCE (untrusted data)` blocks (`<evidence id=… video=… start=…>`) followed by `<question>`. Delimiter-like tags inside evidence or the question are neutralized. Transcript text never enters the system message. This reduces, but cannot eliminate, injection risk; see [security.md](security.md).

## What verification does *not* do
Grounding is a lexical heuristic: a fluent answer that distorts a passage's meaning with the same words can pass. Whether the answer "addresses the question" relies on the model's `answerable` flag. LLM-based entailment checking is a roadmap item.

## Modes not yet complete
`teach` is a single-turn progressive explanation (no adaptive multi-turn tutoring). Quiz results are stored only as anonymous per-client counters (`/api/quiz/results`, `/api/quiz/stats/{id}`), keyed by IP until auth exists.

## Comparison
Output is structured: `common`, `differences`, `unique`, `conflicts`, each point with per-video source timestamps. Evidence retrieval is interleaved per video so one video cannot crowd out the other. Points in `common`/`differences`/`conflicts` must cite evidence from at least two different videos, or they are demoted to `unique`; points without valid evidence are dropped. This enforces "don't pretend videos agree" structurally, but it cannot judge whether two cited passages truly agree: that still depends on the model.

## Answer cache
`ask/cache.py`: identical questions (normalized) with the same mode/level/length are served from Redis with zero retrieval and zero LLM calls (`cached: true`). Keys include each video's index version, so re-indexing invalidates them. Only grounded answers are cached; set `ANSWER_CACHE_TTL_SECONDS=0` to disable.

## Extending
Add a tool: a typed function in `tools.py` and a call in `retrieve_step`. Add an intent: a rule in `planner.py`, a mode rule + schema in `prompts.py`, a branch in `verify_node`. Swap models: implement `LLMProvider` (`app/llm.py`).
