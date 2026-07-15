"""Minimal IngestionMetadata — ConversationSource ka FK isko chahiye.
Full ingestion models Phase 5 mein expand honge."""

import shortuuid
from sqlalchemy import BigInteger, ForeignKey, Unicode
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.db.base import Base, BigIntPK, TimestampMixin


class IngestionMetadata(Base, BigIntPK, TimestampMixin):
    __tablename__ = "tenant_ingest_metadata"

    external_uid: Mapped[str] = mapped_column(Unicode(22), unique=True, default=shortuuid.uuid)
    source_type: Mapped[str | None] = mapped_column(Unicode(50))
    source_path: Mapped[str | None] = mapped_column(Unicode(1024))
    tenant_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("tenant.id"))