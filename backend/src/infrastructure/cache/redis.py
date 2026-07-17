"""
Redis cache — old system mein cache decorators commented-out the; ab real.

Design: fail-open. Redis down ho to caching silently skip, app chalti rahe —
cache availability kabhi correctness ka masla nahi banna chahiye.
"""

import json
import logging
from typing import Any

import redis.asyncio as aioredis

from src.config import get_settings

log = logging.getLogger(__name__)

_client: aioredis.Redis | None = None


def init_redis() -> None:
    global _client
    if _client is None:
        s = get_settings()
        _client = aioredis.from_url(
            s.redis_url, decode_responses=True, socket_connect_timeout=2
        )


async def close_redis() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def get_redis() -> aioredis.Redis | None:
    return _client


async def cache_get_json(key: str) -> Any | None:
    if _client is None:
        return None
    try:
        raw = await _client.get(key)
        return json.loads(raw) if raw else None
    except Exception as e:
        log.warning("cache get failed (%s): %s", key, e)
        return None


async def cache_set_json(key: str, value: Any, ttl_seconds: int = 60) -> None:
    if _client is None:
        return
    try:
        await _client.set(key, json.dumps(value, default=str), ex=ttl_seconds)
    except Exception as e:
        log.warning("cache set failed (%s): %s", key, e)


async def incr_with_ttl(key: str, ttl_seconds: int) -> int | None:
    """Rate limiting ke liye: atomic INCR + pehli dafa TTL. Redis down -> None."""
    if _client is None:
        return None
    try:
        pipe = _client.pipeline()
        pipe.incr(key)
        pipe.expire(key, ttl_seconds, nx=True)
        count, _ = await pipe.execute()
        return int(count)
    except Exception as e:
        log.warning("rate-limit incr failed: %s", e)
        return None