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

MAX_CONTEXT_CHARS = 3000  # rough token-budget guard; tune per model window


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
    cag = cag_context.strip()
    rag = rag_context.strip()
    if rag == "No context found.":
        rag = ""

    if not cag and not rag:
        return "No context found."

    # Give each section a fair share of the budget instead of letting
    # whichever comes first (CAG) starve the other on truncation.
    half = MAX_CONTEXT_CHARS // 2
    if len(cag) > half and len(rag) > half:
        cag = cag[:half] + "\n[...truncated]"
        rag = rag[:half] + "\n[...truncated]"
    elif len(cag) + len(rag) > MAX_CONTEXT_CHARS:
        # one side is small — give the other whatever's left over
        if len(cag) <= half:
            rag = rag[: MAX_CONTEXT_CHARS - len(cag)] + "\n[...truncated]"
        else:
            cag = cag[: MAX_CONTEXT_CHARS - len(rag)] + "\n[...truncated]"

    parts = []
    if cag:
        parts.append(f"## Prepared / frequently-used context\n{cag}")
    if rag:
        parts.append(f"## Retrieved document context\n{rag}")
    return "\n\n".join(parts)