"""
CAG warm-load orchestration — S3 (durable) -> Redis (runtime).
Context SELECTION at question-time is a separate, later step.
"""

import logging
import re
from difflib import SequenceMatcher

from src.infrastructure.cache import cag_cache
from src.rag.ingest.providers import cag_s3

log = logging.getLogger(__name__)

_WORD_RE = re.compile(r"[a-zA-Z0-9]+")


_STOPWORDS = {
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'what', 'who', 'when', 'where', 'why', 'how', 'do', 'does', 'did',
    'of', 'in', 'on', 'at', 'to', 'for', 'with', 'and', 'or', 'but',
    'it', 'this', 'that', 'my', 'your', 'i', 'you', 'we', 'they'
}


def _terms(text: str) -> set[str]:
    return {
        w.lower() for w in _WORD_RE.findall(text)
        if len(w) >= 2 and w.lower() not in _STOPWORDS
    }


def _fuzzy_match(term: str, doc_terms: set[str], threshold: float = 0.82) -> bool:
    """Exact match, or close enough to survive a typo like 'cogntio' vs 'cognito'."""
    if term in doc_terms:
        return True
    for dt in doc_terms:
        if abs(len(term) - len(dt)) <= 2 and SequenceMatcher(None, term, dt).ratio() >= threshold:
            return True
    return False


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
    docs = await cag_cache.get_all_docs_cache_aside(brand_id)
    if not docs:
        return {}

    q_terms = _terms(question)
    if not q_terms:
        return {}

    doc_terms_map = {doc_id: _terms(content) for doc_id, content in docs.items()}

    # terms present in most docs (e.g. the company name) carry little
    # signal — downweight instead of counting them equally with rare terms
    doc_count = len(doc_terms_map)
    term_doc_freq: dict[str, int] = {}
    for terms in doc_terms_map.values():
        for t in terms:
            term_doc_freq[t] = term_doc_freq.get(t, 0) + 1

    def term_weight(term: str) -> float:
        freq = term_doc_freq.get(term, 1)
        return 1.0 if freq <= doc_count / 2 else 0.2  # common-to-most-docs terms count for less

    scored = []
    for doc_id, doc_terms in doc_terms_map.items():
        score = sum(term_weight(qt) for qt in q_terms if _fuzzy_match(qt, doc_terms))
        if score > 0:
            scored.append((score, doc_id, docs[doc_id]))

    scored.sort(key=lambda x: x[0], reverse=True)
    return {doc_id: content for _, doc_id, content in scored[:top_n]}


async def score_debug(question: str, brand_id: str) -> list[dict]:
    """Debug-only: full scoring breakdown for every cached doc, not just
    the top_n winners select_context() returns. Use this instead of
    guessing why a doc did/didn't make the cut."""
    docs = await cag_cache.get_all_docs_cache_aside(brand_id)
    if not docs:
        return []

    q_terms = _terms(question)
    doc_terms_map = {doc_id: _terms(content) for doc_id, content in docs.items()}
    doc_count = len(doc_terms_map)
    term_doc_freq: dict[str, int] = {}
    for terms in doc_terms_map.values():
        for t in terms:
            term_doc_freq[t] = term_doc_freq.get(t, 0) + 1

    def term_weight(term: str) -> float:
        freq = term_doc_freq.get(term, 1)
        return 1.0 if freq <= doc_count / 2 else 0.2

    results = []
    for doc_id, doc_terms in doc_terms_map.items():
        matched = [qt for qt in q_terms if _fuzzy_match(qt, doc_terms)]
        score = sum(term_weight(qt) for qt in matched)
        results.append({"doc_id": doc_id, "score": round(score, 3), "matched_terms": matched})

    results.sort(key=lambda r: r["score"], reverse=True)
    return results