"""
Bedrock Knowledge Base provider — old rag_query.py ke KB path ka port.

Asymmetry yaad rakho (base.py ka note): KB khud chunk+embed karta hai,
is liye yahan add_documents = ingestion job trigger (old
IngestionMetadataProcessor.sync_knowledge_base ka kaam), search = retrieve API.
"""

import asyncio
from typing import Any

import boto3
from langchain_core.documents import Document

from src.config import Settings
from src.rag.vectorstore.base import (
    ScoredDocument,
    SearchFilter,
    VectorStoreProvider,
    register_vectorstore,
)


def _to_kb_filter(f: SearchFilter | None) -> dict | None:
    if f is None:
        return None
    conditions: list[dict] = []
    if f.brand_id is not None:
        conditions.append({"equals": {"key": "brand_name", "value": f.brand_id}})
    if f.security_levels:
        conditions.append({"in": {"key": "security_level", "value": f.security_levels}})
    for key, value in f.extra.items():
        conditions.append({"equals": {"key": key, "value": value}})
    if not conditions:
        return None
    return conditions[0] if len(conditions) == 1 else {"andAll": conditions}


@register_vectorstore("bedrock_kb")
class BedrockKBProvider(VectorStoreProvider):
    def __init__(self, embeddings: Any, settings: Settings):
        # embeddings intentionally unused — KB apni embeddings khud manage karta hai
        self._kb_id = settings.KNOWLEDGE_BASE_ID
        self._ds_id = settings.KB_DATASOURCE_ID
        self._runtime = boto3.client("bedrock-agent-runtime", region_name=settings.BEDROCK_REGION)
        self._agent = boto3.client("bedrock-agent", region_name=settings.BEDROCK_REGION)

    async def add_documents(self, docs: list[Document], **kwargs) -> list[str]:
        """KB path: docs pehle hi S3 mein hain — yahan sirf sync job trigger."""
        resp = await asyncio.to_thread(
            self._agent.start_ingestion_job,
            knowledgeBaseId=self._kb_id,
            dataSourceId=self._ds_id,
        )
        return [resp["ingestionJob"]["ingestionJobId"]]

    async def search(
        self, query: str, k: int = 5, filters: SearchFilter | None = None
    ) -> list[ScoredDocument]:
        vector_cfg: dict = {"numberOfResults": k}
        kb_filter = _to_kb_filter(filters)
        if kb_filter:
            vector_cfg["filter"] = kb_filter

        resp = await asyncio.to_thread(
            self._runtime.retrieve,
            knowledgeBaseId=self._kb_id,
            retrievalQuery={"text": query},
            retrievalConfiguration={"vectorSearchConfiguration": vector_cfg},
        )
        out: list[ScoredDocument] = []
        for r in resp.get("retrievalResults", []):
            doc = Document(
                page_content=r.get("content", {}).get("text", ""),
                metadata={
                    **(r.get("metadata") or {}),
                    "location": r.get("location", {}),
                },
            )
            out.append(ScoredDocument(document=doc, score=r.get("score")))
        return out