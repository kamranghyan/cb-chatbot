"""
Chat CRUD service — old 819-line ChatService ka sirf CRUD hissa
(Salesforce/email/analytics apne apne phases mein alag services banenge).

Pattern notes:
  - AsyncSession constructor-inject hota hai (global session import nahi)
  - selectinload() query-site pe — old lazy="joined" model-level greed khatam
  - AuthContext parameter se aata hai — thread-local magic nahi
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.auth import AuthContext
from src.core.exceptions import NotFoundError
from src.infrastructure.db.models import Chat, ChatSession, Conversation


class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_chat_list(self, ctx: AuthContext) -> list[Chat]:
        result = await self.db.execute(
            select(Chat)
            .where(Chat.email == ctx.email, Chat.is_active.is_(True))
            .order_by(Chat.id.desc())
        )
        return list(result.scalars().all())

    async def get_chat(self, external_chat_id: str) -> Chat:
        result = await self.db.execute(
            select(Chat)
            .where(Chat.external_chat_id == external_chat_id)
            .options(
                selectinload(Chat.conversations).selectinload(Conversation.sources)
            )
        )
        chat = result.scalars().first()
        if chat is None:
            raise NotFoundError(f"Chat '{external_chat_id}' not found")
        return chat

    async def get_chats_by_session(self, session_id: int) -> list[Chat]:
        result = await self.db.execute(
            select(Chat)
            .join(ChatSession, ChatSession.external_chat_id == Chat.external_chat_id)
            .where(ChatSession.session_id == session_id)
            .order_by(Chat.id.desc())
        )
        return list(result.scalars().all())

    async def conversation_feedback(self, external_conv_id: str, feedback: dict) -> Conversation:
        result = await self.db.execute(
            select(Conversation).where(Conversation.external_conv_id == external_conv_id)
        )
        convo = result.scalars().first()
        if convo is None:
            raise NotFoundError(f"Conversation '{external_conv_id}' not found")
        convo.reaction = feedback
        await self.db.flush()
        return convo