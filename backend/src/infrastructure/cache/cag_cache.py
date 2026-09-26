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
from src.rag.ingest.providers import cag_s3

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


async def get_or_fetch(brand_id: str, doc_id: str) -> str | None:
    """
    Cache-aside: Redis HIT -> return immediately, no S3 touched.
    Redis MISS -> fetch from S3 (source of truth) -> populate Redis -> return.
    S3 MISS too -> return None, nothing cached (never cache empty/missing data).
    """
    cached = await get_doc(brand_id, doc_id)
    if cached is not None:
        log.info("CAG cache HIT: %s/%s", brand_id, doc_id)
        return cached

    log.info("CAG cache MISS: %s/%s — fetching from S3", brand_id, doc_id)
    key = f"clients/{brand_id}/cag/{doc_id}.md"
    try:
        content = await cag_s3.load_doc(key)
    except Exception as e:
        log.info("CAG S3 MISS for %s: %s", key, e)
        return None

    log.info("CAG storing in Redis: %s/%s", brand_id, doc_id)
    await set_doc(brand_id, doc_id, content)
    return content


async def get_all_docs_cache_aside(brand_id: str) -> dict[str, str]:
    """
    Like get_all_docs, but self-heals from S3 instead of trusting Redis's
    index blindly. S3 is the authority on which doc_ids exist for a tenant;
    each doc's *content* is still fetched cache-aside (Redis first).
    """
    doc_keys = await cag_s3.list_tenant_docs(brand_id)
    docs: dict[str, str] = {}
    for key in doc_keys:
        doc_id = key.rsplit("/", 1)[-1].removesuffix(".md")
        content = await get_or_fetch(brand_id, doc_id)
        if content is not None:
            docs[doc_id] = content
    return docs