"""SQLAlchemy 2.0 declarative base + timestamp mixin (old MixinTimestamp ka port)."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class BigIntPK:
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)