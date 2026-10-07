import random


def backoff_with_jitter(attempt: int, base: float, cap: float, rng: random.Random | None = None) -> int:
    """Exponential backoff with +/-50% jitter, capped. attempt is 0-based."""
    rng = rng or random
    raw = min(cap, base * (2 ** max(attempt, 0)))
    return max(1, int(raw * rng.uniform(0.5, 1.5)))
