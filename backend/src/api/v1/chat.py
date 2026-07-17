"""Chat CRUD routes — old api/chat/v1/chat.py ke read/feedback endpoints.
POST /chat (RAG) Phase 3 mein, /chat/stream Phase 4 mein isi router pe aayega."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.schemas.chat import ChatDetailOut, ChatListItemOut, FeedbackIn
from src.core.auth import RequireUser
from src.infrastructure.db.session import get_db
from src.services.chat_service import ChatService

router = APIRouter()

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/list", response_model=list[ChatListItemOut])
async def get_chat_list(ctx: RequireUser, db: DB):
    return await ChatService(db).get_chat_list(ctx)


@router.get("/session/{session_id}", response_model=list[ChatListItemOut])
async def get_chats_by_session(session_id: int, ctx: RequireUser, db: DB):
    return await ChatService(db).get_chats_by_session(session_id)


@router.get("/{external_chat_id}", response_model=ChatDetailOut)
async def get_chat(external_chat_id: str, ctx: RequireUser, db: DB):
    return await ChatService(db).get_chat(external_chat_id)


@router.post("/feedback/{external_conv_id}")
async def conversation_feedback(external_conv_id: str, body: FeedbackIn, ctx: RequireUser, db: DB):
    convo = await ChatService(db).conversation_feedback(
        external_conv_id, body.model_dump(exclude_none=True)
    )
    return {"external_conv_id": convo.external_conv_id, "reaction": convo.reaction}