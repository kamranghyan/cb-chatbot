"""Raw text loader — API se direct text ingest (sab se simple path)."""

from typing import Any

from langchain_core.documents import Document

from src.rag.ingest.base import DocumentLoader, register_loader


@register_loader("text")
class TextLoader(DocumentLoader):
    async def load(self, source: str, metadata: dict[str, Any] | None = None) -> list[Document]:
        return [Document(page_content=source, metadata=metadata or {})]