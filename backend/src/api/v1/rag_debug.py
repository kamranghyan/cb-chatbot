"""
RAG debug endpoints — SIRF local env. Phase 2 providers ko chat pipeline
(Phase 3) se pehle isolate test karne ke liye:

    POST /api/v1/rag/generate    -> LLM provider test (stream=false/true)
    POST /api/v1/rag/embed       -> embeddings test (vector length + preview)
    POST /api/v1/rag/documents   -> vectorstore add_documents test
    POST /api/v1/rag/search      -> vectorstore search + RBAC filter test
"""

from typing import Any

from fastapi import APIRouter
from langchain_core.documents import Document
from pydantic import BaseModel

from src.config import get_settings
from src.core.exceptions import NotFoundError
from src.rag.factory import get_rag_components
from src.rag.vectorstore.base import SearchFilter

router = APIRouter()


def _local_only() -> None:
    if not get_settings().is_local:
        raise NotFoundError()


class GenerateIn(BaseModel):
    prompt: str
    stream: bool = False


class EmbedIn(BaseModel):
    text: str


class DocumentsIn(BaseModel):
    texts: list[str]
    metadata: dict[str, Any] = {}


class SearchIn(BaseModel):
    query: str
    k: int = 4
    security_levels: list[str] = []
    department_id: str | None = None
    brand_id: str | None = None


@router.post("/generate")
async def rag_generate(body: GenerateIn):
    _local_only()
    rag = get_rag_components()
    if body.stream:
        chunks = [c async for c in rag.llm_provider.stream(rag.model, body.prompt)]
        return {"streamed_chunks": len(chunks), "answer": "".join(chunks)}
    answer = await rag.llm_provider.generate(rag.model, body.prompt)
    return {"answer": answer}


@router.post("/embed")
async def rag_embed(body: EmbedIn):
    _local_only()
    rag = get_rag_components()
    vector = await rag.embeddings.aembed_query(body.text)
    return {"dimensions": len(vector), "preview": vector[:5]}


@router.post("/documents")
async def rag_add_documents(body: DocumentsIn):
    _local_only()
    rag = get_rag_components()
    docs = [Document(page_content=t, metadata=body.metadata) for t in body.texts]
    ids = await rag.vectorstore.add_documents(docs)
    return {"added": len(ids), "ids": ids}


@router.post("/search")
async def rag_search(body: SearchIn):
    _local_only()
    rag = get_rag_components()
    filters = SearchFilter(
        security_levels=body.security_levels,
        department_id=body.department_id,
        brand_id=body.brand_id,
    )
    results = await rag.vectorstore.search(body.query, k=body.k, filters=filters)
    return [
        {
            "content": r.document.page_content,
            "metadata": r.document.metadata,
            "score": r.score,
        }
        for r in results
    ]