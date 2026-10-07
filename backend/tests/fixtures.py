"""A small SYNTHETIC lecture (written for tests/eval; not a real video)."""

SEGMENTS = [
    (0, 40, "Welcome to this lecture on caching in distributed systems. Today we cover caching, Redis, and consistency."),
    (
        40,
        90,
        "A cache stores frequently used data in fast memory so repeated reads avoid the slow database. A cache hit means the data was found; a cache miss means we must fetch it from the database.",
    ),
    (
        90,
        150,
        "Cache invalidation is the hard part. When the database row changes, the cached copy becomes stale, so we either expire it with a time to live or delete it explicitly on write.",
    ),
    (
        150,
        210,
        "Redis is an in-memory key value store. It supports strings, hashes, lists and sorted sets, and it can persist snapshots to disk with RDB or an append only file.",
    ),
    (
        210,
        280,
        "To scale Redis horizontally we use sharding with consistent hashing, so adding a node only moves a small fraction of keys between nodes.",
    ),
    (
        280,
        350,
        "The CAP theorem says a distributed system cannot provide consistency, availability and partition tolerance all at once. During a network partition you must choose between consistency and availability.",
    ),
    (
        350,
        420,
        "Replication copies data across nodes. Leader follower replication sends all writes to the leader and followers apply them asynchronously, which can cause replication lag and stale reads.",
    ),
    (
        420,
        480,
        "Finally, for interviews remember three things: always explain the cache invalidation strategy, mention the thundering herd problem on a cold cache, and discuss consistency trade-offs.",
    ),
]
CHAPTERS = [
    {"title": "Caching basics", "start_seconds": 0, "end_seconds": 150, "summary": "Hits, misses and invalidation."},
    {"title": "Redis and scaling", "start_seconds": 150, "end_seconds": 280, "summary": "Redis data model and sharding."},
    {"title": "Consistency", "start_seconds": 280, "end_seconds": 480, "summary": "CAP, replication, interview tips."},
]


def segments():
    return [{"start": float(a), "end": float(b), "text": t} for a, b, t in SEGMENTS]
