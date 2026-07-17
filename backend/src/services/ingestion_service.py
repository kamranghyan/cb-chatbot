"""
Ingestion orchestrator — pipeline: load -> chunk -> stamp -> store.

Old system mein yeh poora flow exist nahi karta tha (Bedrock KB ko delegated).
Ab pgvector path ke liye in-app hai; bedrock_kb vectorstore ho to
add_documents adapter ke andar KB sync trigger ban jata hai (Phase 2 ka
asymmetry note) — service code same rehta hai.

Stamp step sab se important hai: security_level / department_id / brand_id
har chunk ke metadata pe lagti hai — YEHI Phase 3 ke RBAC filters ko
kaam karne layak banata hai.
"""

import logging

from langchain_core.documents import Document
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.core.auth import AuthContext
from src.domain.enums import IngestionStatus, SecurityLevel
from src.infrastructure.db.models import IngestionMetadata
from src.rag.chunk.base import get_chunker
from src.rag.factory import RagComponents
from src.rag.ingest.providers.file import FileLoader
from src.rag.ingest.providers.s3 import S3Loader
from src.rag.ingest.providers.text import TextLoader

log = logging.getLogger(__name__)


class IngestionService:
    def __init__(self, db: AsyncSession, rag: RagComponents):
        self.db = db
        self.rag = rag
        self.chunker = get_chunker(get_settings().CHUNKER_PROVIDER)()

    # ---------- entrypoints (source-type ke hisaab se) ----------

    async def ingest_text(
        self, ctx: AuthContext, text: str, name: str, security_level: SecurityLevel,
        department_id: str | None = None,
    ) -> IngestionMetadata:
        docs = await TextLoader().load(text)
        return await self._run(ctx, docs, "text", name, security_level, department_id)

    async def ingest_file(
        self, ctx: AuthContext, filename: str, data: bytes, security_level: SecurityLevel,
        department_id: str | None = None,
    ) -> IngestionMetadata:
        docs = await FileLoader().load_bytes(filename, data)
        return await self._run(ctx, docs, "file", filename, security_level, department_id)

    async def ingest_s3(
        self, ctx: AuthContext, s3_key: str, security_level: SecurityLevel,
        department_id: str | None = None,
    ) -> IngestionMetadata:
        docs = await S3Loader().load(s3_key)
        return await self._run(ctx, docs, "s3", s3_key, security_level, department_id)

    async def list_ingestions(self) -> list[IngestionMetadata]:
        result = await self.db.execute(
            select(IngestionMetadata).order_by(IngestionMetadata.id.desc()).limit(100)
        )
        return list(result.scalars().all())

    # ---------- pipeline ----------

    async def _run(
        self, ctx: AuthContext, docs: list[Document], source_type: str, source_path: str,
        security_level: SecurityLevel, department_id: str | None,
    ) -> IngestionMetadata:
        record = IngestionMetadata(
            source_type=source_type,
            source_path=source_path[:1024],
            status=IngestionStatus.PROCESSING,
            security_level=security_level,
            department_id=department_id,
            brand_id=ctx.brand_id,
        )
        self.db.add(record)
        await self.db.flush()

        try:
            chunks = self.chunker.chunk(docs)
            self._stamp(chunks, record, security_level, department_id, ctx)
            await self.rag.vectorstore.add_documents(chunks)

            record.status = IngestionStatus.COMPLETED
            record.chunk_count = len(chunks)
            log.info("Ingested %s '%s': %d chunks", source_type, source_path, len(chunks))
        except Exception as e:
            record.status = IngestionStatus.FAILED
            record.error = str(e)[:2000]
            log.exception("Ingestion failed for %s", source_path)

        await self.db.flush()
        return record

    @staticmethod
    def _stamp(
        chunks: list[Document], record: IngestionMetadata,
        security_level: SecurityLevel, department_id: str | None, ctx: AuthContext,
    ) -> None:
        for c in chunks:
            c.metadata.update({
                "security_level": security_level.value,
                "source_uid": record.external_uid,
                "source_name": record.source_path,
            })
            if department_id:
                c.metadata["department_id"] = department_id
            if ctx.brand_id:
                c.metadata["brand_id"] = str(ctx.brand_id)