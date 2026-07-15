"""Pydantic v2 schemas — old Pydantic v1 schemas ka port (orm_mode -> from_attributes)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from src.domain.enums import CategoryEnum, SubCategoryEnum


class ConversationSourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    distance: float
    doc_metadata: dict | None = None


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    external_conv_id: str
    question: str | None = None
    answer: str | None = None
    reaction: dict | None = None
    is_regenerate: bool
    response_time: float | None = None
    created_at: datetime
    sources: list[ConversationSourceOut] = []


class ChatListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    external_chat_id: str
    title: str
    model: str
    brand_id: str
    category: CategoryEnum
    sub_category: SubCategoryEnum | None = None
    created_at: datetime


class ChatDetailOut(ChatListItemOut):
    conversations: list[ConversationOut] = []


class FeedbackIn(BaseModel):
    """Old ConversationReactionSchema."""

    liked: bool | None = None
    disliked: bool | None = None
    comment: str | None = Field(default=None, max_length=2000)


class DevTokenIn(BaseModel):
    email: str = "dev@local.test"