"""Retry helper for Groq *chat completion* calls.

Groq's audio transcription endpoint and its chat completions endpoint both
use HTTP 413, but they mean different things:

- Audio uploads: the file is genuinely too many bytes. Retrying identically
  will never help -- it has to be split instead (see transcript_agent.py).
- Chat completions: in practice this is almost always a tokens-per-minute
  rate limit, not the request itself being oversized -- Groq's compound
  models in particular burn a lot of tokens internally on web search/tool
  calls that never appear in the prompt you sent. That budget resets every
  minute, so a short backoff-and-retry recovers from it the same way it
  would from an explicit 429.

There's a third case handled here too: Groq's JSON mode
(`response_format={"type": "json_object"}`) occasionally returns a 400
with code `json_validate_failed` when the model's own output didn't
parse -- a generation hiccup from a non-deterministic model, not a
malformed request. The same prompt often succeeds on a second,
independently-sampled attempt, so this is retried too. Other 400s (bad
params, invalid model name, etc.) are genuinely not retryable and are
raised immediately.

The SDK's own built-in retries already cover 429/5xx; this adds 413 and
the json_validate_failed case to that set for chat completions.
"""

import time

import groq

_RETRYABLE_STATUS_CODES = (413, 429)


def _is_retryable(exc: groq.APIStatusError) -> bool:
    if exc.status_code in _RETRYABLE_STATUS_CODES:
        return True
    if exc.status_code == 400:
        body = exc.body if isinstance(exc.body, dict) else {}
        error = body.get("error") if isinstance(body, dict) else None
        error = error if isinstance(error, dict) else {}
        return error.get("code") == "json_validate_failed"
    return False


def call_with_retries(fn, *args, max_retries: int = 4, base_delay: float = 3.0, **kwargs):
    """Calls fn(*args, **kwargs), retrying with exponential backoff on
    rate-limit-shaped and generation-hiccup errors. Raises immediately for
    anything else, and re-raises the last error once retries are
    exhausted.
    """
    last_exc = None
    for attempt in range(max_retries + 1):
        try:
            return fn(*args, **kwargs)
        except groq.APIStatusError as exc:
            if not _is_retryable(exc) or attempt == max_retries:
                raise
            last_exc = exc
            time.sleep(base_delay * (2**attempt))
    raise last_exc  # pragma: no cover -- loop above always returns or raises
