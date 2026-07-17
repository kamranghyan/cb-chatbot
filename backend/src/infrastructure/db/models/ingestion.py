"""Ingestion metadata — Phase 5 mein expand hua (status tracking + RBAC stamp)."""

import shortuuid
from sqlalchemy import BigInteger, Enum, ForeignKey, Integer, Unicode
from sqlalchemy.orm import Mapped, mapped_column

from src.domain.enums import IngestionStatus, SecurityLevel
from src.infrastructure.db.base import Base, BigIntPK, TimestampMixin


class IngestionMetadata(Base, BigIntPK, TimestampMixin):
    __tablename__ = "tenant_ingest_metadata"

    external_uid: Mapped[str] = mapped_column(Unicode(22), unique=True, default=shortuuid.uuid)
    source_type: Mapped[str | None] = mapped_column(Unicode(50))     # text | file | s3 | kb
    source_path: Mapped[str | None] = mapped_column(Unicode(1024))   # filename / s3 key
    tenant_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("tenant.id"))

    status: Mapped[IngestionStatus] = mapped_column(
        Enum(IngestionStatus, native_enum=False),
        default=IngestionStatus.PENDING,
        server_default=IngestionStatus.PENDING.name,
    )
    error: Mapped[str | None] = mapped_column(Unicode(2000))
    chunk_count: Mapped[int | None] = mapped_column(Integer)

    # RBAC stamp — yeh values har chunk ke metadata mein jati hain,
    # inhi pe Phase 3 ke SearchFilter chalte hain
    security_level: Mapped[SecurityLevel] = mapped_column(
        Enum(SecurityLevel, native_enum=False),
        default=SecurityLevel.PUBLIC,
        server_default=SecurityLevel.PUBLIC.name,
    )
    department_id: Mapped[str | None] = mapped_column(Unicode(50))
    brand_id: Mapped[str | None] = mapped_column(Unicode(50))