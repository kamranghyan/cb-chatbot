"""
CAG warm-load orchestration — S3 (durable) -> Redis (runtime).
Context SELECTION at question-time is a separate, later step.
"""

import logging
import re

from src.infrastructure.cache import cag_cache
from src.rag.ingest.providers import cag_s3

log = logging.getLogger(__name__)

_WORD_RE = re.compile(r"[a-zA-Z0-9]+")


def _terms(text: str) -> set[str]:
    return {w.lower() for w in _WORD_RE.findall(text) if len(w) > 2}


async def warm_load_tenant(brand_id: str) -> int:
    keys = await cag_s3.list_tenant_docs(brand_id)
    if not keys:
        return 0

    await cag_cache.clear_tenant(brand_id)

    loaded = 0
    for key in keys:
        try:
            content = await cag_s3.load_doc(key)
            doc_id = key.rsplit("/", 1)[-1].removesuffix(".md")
            await cag_cache.set_doc(brand_id, doc_id, content)
            loaded += 1
        except Exception as e:
            log.warning("CAG warm-load failed for %s: %s", key, e)

    log.info("CAG warm-load: tenant %s -> %d doc(s)", brand_id, loaded)
    return loaded


async def warm_load_all() -> None:
    """Startup entrypoint. Fully fail-soft — never blocks app boot."""
    try:
        tenant_ids = await cag_s3.discover_tenant_ids()
    except Exception as e:
        log.warning("CAG warm-load skipped — S3 discovery failed: %s", e)
        return

    if not tenant_ids:
        log.info("CAG warm-load: no tenant CAG data found in S3")
        return

    for brand_id in tenant_ids:
        try:
            await warm_load_tenant(brand_id)
        except Exception as e:
            log.warning("CAG warm-load failed for tenant %s: %s", brand_id, e)


async def select_context(question: str, brand_id: str, top_n: int = 2) -> dict[str, str]:
    """
    Keyword-overlap relevance — not full RAG vector search, intentionally
    cheap. Returns {doc_id: content} for the top_n most relevant cached docs,
    or {} if nothing scores above zero (avoids dumping unrelated docs).
    """
    docs = await cag_cache.get_all_docs(brand_id)
    if not docs:
        return {}

    q_terms = _terms(question)
    if not q_terms:
        return {}

    scored = []
    for doc_id, content in docs.items():
        overlap = len(q_terms & _terms(content))
        if overlap > 0:
            scored.append((overlap, doc_id, content))

    scored.sort(key=lambda x: x[0], reverse=True)
    return {doc_id: content for _, doc_id, content in scored[:top_n]}