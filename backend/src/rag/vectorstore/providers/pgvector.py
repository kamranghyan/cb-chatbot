"""
PGVector provider — old rag_query.py ke pgvector path ka replacement.

Old: langchain_community.vectorstores.PGVector (deprecated, psycopg2)
Naya: langchain-postgres (psycopg3, JSONB metadata + indexed operators)

RBAC yahin enforce hota hai: SearchFilter -> JSONB metadata filter
($in security_level, $eq department/brand). Old system ka behavior same,
bas typed aur ek jagah.
"""

import asyncio

from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_postgres import PGVector

from src.config import Settings
from src.rag.vectorstore.base import (
    ScoredDocument,
    SearchFilter,
    VectorStoreProvider,
    register_vectorstore,
)


def _to_pg_filter(f: SearchFilter | None) -> dict | None:
    if f is None:
        return None
    conditions: dict = {}
    if f.security_levels:
        conditions["security_level"] = {"$in": f.security_levels}
    if f.department_id is not None:
        conditions["department_id"] = {"$eq": str(f.department_id)}
    if f.brand_id is not None:
        conditions["brand_id"] = {"$eq": str(f.brand_id)}
    conditions.update(f.extra)
    return conditions or None


@register_vectorstore("pgvector")
class PGVectorStoreProvider(VectorStoreProvider):
    def __init__(self, embeddings: Embeddings, settings: Settings):
        self._store = PGVector(
            embeddings=embeddings,
            collection_name=settings.EMBEDDINGS_COLLECTION,
            connection=settings.sync_database_url,  # psycopg3
            use_jsonb=True,
        )

    async def add_documents(self, docs: list[Document], **kwargs) -> list[str]:
        # langchain-postgres sync hai — event loop block na ho is liye to_thread
        return await asyncio.to_thread(self._store.add_documents, docs)

    async def search(
        self, query: str, k: int = 5, filters: SearchFilter | None = None
    ) -> list[ScoredDocument]:
        results = await asyncio.to_thread(
            self._store.similarity_search_with_score, query, k, _to_pg_filter(filters)
        )
        return [ScoredDocument(document=doc, score=score) for doc, score in results]