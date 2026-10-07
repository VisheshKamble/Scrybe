"""LLMProvider abstraction. Groq is one implementation; add another by
subclassing `LLMProvider` and returning it from `get_llm()`."""

from __future__ import annotations

import abc
import time
from dataclasses import dataclass

from app.config import settings
from app.errors import ErrorCode, ScrybeError


@dataclass
class LLMResult:
    text: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: float = 0.0


class LLMProvider(abc.ABC):
    @abc.abstractmethod
    def complete(
        self, *, system: str, user: str, model: str | None = None, json_mode: bool = False, max_tokens: int | None = None
    ) -> LLMResult: ...


class GroqLLM(LLMProvider):
    def __init__(self):
        from groq import Groq

        self._client = Groq(api_key=settings.groq_api_key, max_retries=2, timeout=settings.agent_llm_timeout_seconds)

    def complete(self, *, system, user, model=None, json_mode=False, max_tokens=None):
        import groq

        kwargs = {
            "model": model or settings.model_reasoning,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        if max_tokens:
            kwargs["max_tokens"] = max_tokens
        start = time.perf_counter()
        try:
            resp = self._client.chat.completions.create(**kwargs)
        except groq.APITimeoutError as exc:
            raise ScrybeError(ErrorCode.AI_TIMEOUT, str(exc)) from exc
        except groq.RateLimitError as exc:
            raise ScrybeError(ErrorCode.AI_RATE_LIMITED, str(exc)) from exc
        except groq.APIError as exc:
            raise ScrybeError(ErrorCode.AI_PROVIDER_ERROR, f"{type(exc).__name__}: {exc}") from exc
        usage = getattr(resp, "usage", None)
        return LLMResult(
            text=resp.choices[0].message.content or "",
            model=kwargs["model"],
            prompt_tokens=getattr(usage, "prompt_tokens", 0) or 0,
            completion_tokens=getattr(usage, "completion_tokens", 0) or 0,
            latency_ms=(time.perf_counter() - start) * 1000,
        )


_llm: LLMProvider | None = None


def get_llm() -> LLMProvider:
    global _llm
    if _llm is None:
        _llm = GroqLLM()
    return _llm


def set_llm(llm: LLMProvider | None) -> None:
    global _llm
    _llm = llm


def estimate_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> float | None:
    """Only computed if the operator configured LLM_PRICES; never guessed."""
    for entry in filter(None, (e.strip() for e in settings.llm_prices.split(","))):
        try:
            name, p_in, p_out = entry.split(":")
            if name == model:
                return (prompt_tokens * float(p_in) + completion_tokens * float(p_out)) / 1_000_000
        except ValueError:
            continue
    return None
