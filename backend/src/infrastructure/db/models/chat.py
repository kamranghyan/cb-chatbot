"""
Chat models — old app/chat/models/chat.py ka port.

Ahem change: old code mein lazy="joined" har relationship pe tha — matlab
har simple query pe saare joins fire hote thay (N+1 se bhi bura, fat queries).
Ab default lazy loading hai; jahan zaroorat ho wahan query pe
selectinload() explicitly (dekho chat_service.py).
"""

import shortuuid
from sqlalchemy import (
    BigInteger,
    Boolean,
    Enum,
    Float,
    ForeignKey,
    Unicode,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, TEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.domain.enums import CategoryEnum, Channel, SubCategoryEnum
from src.infrastructure.db.base import Base, BigIntPK, TimestampMixin


class Chat(Base, BigIntPK, TimestampMixin):
    __tablename__ = "chat"

    external_chat_id: Mapped[str] = mapped_column(
        Unicode(22), unique=True, default=shortuuid.uuid
    )
    external_user_id: Mapped[str | None] = mapped_column(Unicode(255))
    title: Mapped[str] = mapped_column(Unicode(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    model: Mapped[str] = mapped_column(Unicode(255))
    channel_type: Mapped[Channel | None] = mapped_column(Enum(Channel, native_enum=False))
    first_name: Mapped[str | None] = mapped_column(Unicode(255))
    last_name: Mapped[str | None] = mapped_column(Unicode(255))
    user_consent: Mapped[bool | None] = mapped_column(Boolean)
    email: Mapped[str | None] = mapped_column(Unicode(255))
    brand_id: Mapped[str] = mapped_column(Unicode(255))
    category: Mapped[CategoryEnum] = mapped_column(
        Enum(CategoryEnum, native_enum=False), default=CategoryEnum.GENERAL
    )
    sub_category: Mapped[SubCategoryEnum | None] = mapped_column(
        Enum(SubCategoryEnum, native_enum=False)
    )
    issue_description: Mapped[str | None] = mapped_column(Unicode(5000))

    conversations = relationship(
        "Conversation", back_populates="chat", order_by="Conversation.id"
    )
    chat_sessions = relationship("ChatSession", back_populates="chat")


class Conversation(Base, BigIntPK, TimestampMixin):
    # Old class name "Conversations" (plural) tha — grammatically singular sahi hai.
    # Table name wohi purana rakha taake existing data se compatible rahe.
    __tablename__ = "conversations"

    external_chat_id: Mapped[str] = mapped_column(
        Unicode(22), ForeignKey("chat.external_chat_id")
    )
    question: Mapped[str | None] = mapped_column(TEXT)
    answer: Mapped[str | None] = mapped_column(TEXT)
    reaction: Mapped[dict | None] = mapped_column(JSONB)
    external_conv_id: Mapped[str] = mapped_column(
        Unicode(22), unique=True, default=shortuuid.uuid
    )
    is_regenerate: Mapped[bool] = mapped_column(Boolean, default=False)
    session_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("user_sessions.id"))
    response_time: Mapped[float | None] = mapped_column(Float)
    answer_relevance: Mapped[float | None] = mapped_column(Float)
    context_relevance: Mapped[float | None] = mapped_column(Float)
    groundedness: Mapped[float | None] = mapped_column(Float)

    chat = relationship("Chat", back_populates="conversations")
    sources = relationship("ConversationSource", back_populates="conversation")


class ConversationSource(Base, BigIntPK, TimestampMixin):
    __tablename__ = "conversation_sources"
    __table_args__ = (
        UniqueConstraint("conversation_id", "source_uid", name="unique_conv_source"),
    )

    # Old column name "external_conv_id" tha lekin value internal BigInteger FK thi —
    # misleading naming. Naye baseline mein saaf naam (fresh DB ke liye).
    conversation_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("conversations.id"))
    source_uid: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("tenant_ingest_metadata.id")
    )
    distance: Mapped[float] = mapped_column(Float, default=0.0)
    doc_metadata: Mapped[dict | None] = mapped_column(JSONB)

    conversation = relationship("Conversation", back_populates="sources")


class ChatSession(Base, TimestampMixin):
    __tablename__ = "chat_sessions"

    external_chat_id: Mapped[str] = mapped_column(
        Unicode(22), ForeignKey("chat.external_chat_id"), primary_key=True
    )
    session_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("user_sessions.id"), primary_key=True
    )

    chat = relationship("Chat", back_populates="chat_sessions")
    user_session = relationship("UserSession", back_populates="chat_sessions")