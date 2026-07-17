"""User + UserSession — old app/user/models/user.py ka SQLAlchemy 2.0 port."""

from datetime import datetime

import shortuuid
from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, Unicode, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.enums import SecurityLevel
from src.infrastructure.db.base import Base, BigIntPK, TimestampMixin


class User(Base, BigIntPK, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(Unicode(255), unique=True)
    password: Mapped[str] = mapped_column(Unicode(255))  # hashed
    first_name: Mapped[str] = mapped_column(Unicode(255))
    last_name: Mapped[str | None] = mapped_column(Unicode(255))
    dob: Mapped[str | None] = mapped_column(Unicode(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    external_user_id: Mapped[str] = mapped_column(Unicode(255), unique=True)
    security_clearance: Mapped[SecurityLevel] = mapped_column(
        Enum(SecurityLevel, native_enum=False),
        default=SecurityLevel.PUBLIC,
        server_default=SecurityLevel.PUBLIC.name,
    )
    is_developer: Mapped[bool] = mapped_column(Boolean, default=False)
    user_picture: Mapped[str | None] = mapped_column(Unicode(255))
    external_uid: Mapped[str] = mapped_column(Unicode(22), unique=True, default=shortuuid.uuid)

    department_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("department.id"))
    designation_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("designation.id"))
    division_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("division.id"))
    tenant_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tenant.id"))
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("role.id"))
    brand_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("brands.id"))


class UserSession(Base, BigIntPK, TimestampMixin):
    __tablename__ = "user_sessions"

    session_id: Mapped[str] = mapped_column(Unicode(22), unique=True, default=shortuuid.uuid)
    external_user_id: Mapped[str] = mapped_column(
        Unicode(255), ForeignKey("users.external_user_id")
    )
    start_datetime: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    end_datetime: Mapped[datetime | None] = mapped_column(DateTime)

    chat_sessions = relationship("ChatSession", back_populates="user_session")