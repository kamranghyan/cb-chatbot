"""
Context builder — the single point where CAG context, RAG context, or both
get merged into a bounded prompt-ready string.

Kept separate from RagChatService so it can be unit-tested and reused
without touching the existing chat pipeline until RETRIEVAL_OPTION wiring
(next step) actually calls it.
"""

import logging

from src.rag.vectorstore.base import ScoredDocument

log = logging.getLogger(__name__)

MAX_CONTEXT_CHARS = 8000  # rough token-budget guard; tune per model window


def build_rag_context(docs: list[ScoredDocument]) -> str:
    """Same behavior as the existing inline join in rag_chat_service.py —
    reproduced here so RAG-only mode is byte-for-byte compatible once wired."""
    if not docs:
        return "No context found."
    return "\n\n---\n\n".join(d.document.page_content for d in docs)


def build_cag_context(selected: dict[str, str]) -> str:
    """selected = {doc_id: content}, already relevance-filtered by cag_service."""
    if not selected:
        return ""
    return "\n\n---\n\n".join(f"[{doc_id}]\n{content}" for doc_id, content in selected.items())


def merge(cag_context: str, rag_context: str) -> str:
    """Labeled, bounded, deduped-by-source combination for RETRIEVAL_OPTION=both."""
    parts = []
    if cag_context.strip():
        parts.append(f"## Prepared / frequently-used context\n{cag_context.strip()}")
    if rag_context.strip() and rag_context.strip() != "No context found.":
        parts.append(f"## Retrieved document context\n{rag_context.strip()}")

    if not parts:
        return "No context found."

    merged = "\n\n".join(parts)
    if len(merged) > MAX_CONTEXT_CHARS:
        log.warning("Merged CAG+RAG context truncated (%d -> %d chars)", len(merged), MAX_CONTEXT_CHARS)
        merged = merged[:MAX_CONTEXT_CHARS] + "\n\n[...truncated]"
    return merged