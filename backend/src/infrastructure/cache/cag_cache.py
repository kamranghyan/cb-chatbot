"""
CAG runtime cache — tenant-scoped Redis storage for prepared context.
Additive on top of infrastructure/cache/redis.py; doesn't touch existing
rate-limit or analytics caching.

Key convention: tenant:{brand_id}:cag:{doc_id}
No TTL — S3 is the durable source, Redis is rebuilt from S3 on startup
(cag_service.warm_load_all), not time-expired.
"""

import logging

from src.infrastructure.cache.redis import get_redis

log = logging.getLogger(__name__)


def _key(brand_id: str, doc_id: str) -> str:
    return f"tenant:{brand_id}:cag:{doc_id}"


def _index_key(brand_id: str) -> str:
    """Set of doc_ids for a tenant — avoids a Redis KEYS scan (blocking)."""
    return f"tenant:{brand_id}:cag:__index__"


async def set_doc(brand_id: str, doc_id: str, content: str) -> None:
    client = get_redis()
    if client is None:
        return
    try:
        await client.set(_key(brand_id, doc_id), content)
        await client.sadd(_index_key(brand_id), doc_id)
    except Exception as e:
        log.warning("cag cache set failed (%s/%s): %s", brand_id, doc_id, e)


async def get_doc(brand_id: str, doc_id: str) -> str | None:
    client = get_redis()
    if client is None:
        return None
    try:
        return await client.get(_key(brand_id, doc_id))
    except Exception as e:
        log.warning("cag cache get failed (%s/%s): %s", brand_id, doc_id, e)
        return None


async def list_doc_ids(brand_id: str) -> list[str]:
    client = get_redis()
    if client is None:
        return []
    try:
        return list(await client.smembers(_index_key(brand_id)))
    except Exception as e:
        log.warning("cag cache index read failed (%s): %s", brand_id, e)
        return []


async def get_all_docs(brand_id: str) -> dict[str, str]:
    ids = await list_doc_ids(brand_id)
    docs: dict[str, str] = {}
    for doc_id in ids:
        content = await get_doc(brand_id, doc_id)
        if content is not None:
            docs[doc_id] = content
    return docs


async def clear_tenant(brand_id: str) -> None:
    """Wipe a tenant's cached docs before a warm-load re-run, so a file
    deleted in S3 doesn't linger in Redis forever."""
    client = get_redis()
    if client is None:
        return
    try:
        ids = await list_doc_ids(brand_id)
        if ids:
            await client.delete(*[_key(brand_id, i) for i in ids])
        await client.delete(_index_key(brand_id))
    except Exception as e:
        log.warning("cag cache clear failed (%s): %s", brand_id, e)