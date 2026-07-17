"""
File loader — txt/md/pdf bytes se Documents.
Naye format ka support = yahan ek branch ya naya loader; pipeline untouched.
"""

import io
from typing import Any

from langchain_core.documents import Document

from src.core.exceptions import AppException
from src.rag.ingest.base import DocumentLoader, register_loader


@register_loader("file")
class FileLoader(DocumentLoader):
    async def load(self, source: str, metadata: dict[str, Any] | None = None) -> list[Document]:
        raise NotImplementedError("FileLoader.load_bytes(filename, data, metadata) use karo")

    async def load_bytes(
        self, filename: str, data: bytes, metadata: dict[str, Any] | None = None
    ) -> list[Document]:
        meta = {**(metadata or {}), "file_name": filename}
        lower = filename.lower()

        if lower.endswith((".txt", ".md")):
            return [Document(page_content=data.decode("utf-8", errors="replace"), metadata=meta)]

        if lower.endswith(".pdf"):
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(data))
            return [
                Document(
                    page_content=page.extract_text() or "",
                    metadata={**meta, "page": i + 1},
                )
                for i, page in enumerate(reader.pages)
            ]

        from http import HTTPStatus

        raise AppException(
            HTTPStatus.UNSUPPORTED_MEDIA_TYPE, f"Unsupported file type: {filename}"
        )