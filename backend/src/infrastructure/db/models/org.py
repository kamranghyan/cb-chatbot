"""Reference/org tables — old app/user/models ke chhote models ek file mein."""

import shortuuid
from sqlalchemy import BigInteger, ForeignKey, Unicode, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.db.base import Base, BigIntPK, TimestampMixin


class Tenant(Base, BigIntPK, TimestampMixin):
    __tablename__ = "tenant"

    name: Mapped[str] = mapped_column(Unicode(255), unique=True)
    external_uid: Mapped[str] = mapped_column(Unicode(22), unique=True, default=shortuuid.uuid)


class Department(Base, BigIntPK, TimestampMixin):
    __tablename__ = "department"

    name: Mapped[str] = mapped_column(Unicode(255), unique=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tenant.id"))


class Role(Base, BigIntPK, TimestampMixin):
    __tablename__ = "role"
    __table_args__ = (UniqueConstraint("name", "tenant_id", name="_role_tenant_uc"),)

    name: Mapped[str] = mapped_column(Unicode(255))
    description: Mapped[str | None] = mapped_column(Unicode(255))
    external_uid: Mapped[str] = mapped_column(Unicode(22), unique=True, default=shortuuid.uuid)
    tenant_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tenant.id"))


class Designation(Base, BigIntPK, TimestampMixin):
    __tablename__ = "designation"

    name: Mapped[str] = mapped_column(Unicode(255))
    tenant_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tenant.id"))


class Division(Base, BigIntPK, TimestampMixin):
    __tablename__ = "division"

    name: Mapped[str] = mapped_column(Unicode(255))
    tenant_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tenant.id"))


class Brand(Base, BigIntPK, TimestampMixin):
    __tablename__ = "brands"

    name: Mapped[str] = mapped_column(Unicode(255))