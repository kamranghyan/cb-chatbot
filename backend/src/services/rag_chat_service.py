"""
RAG chat orchestrator — old RagChatService + RagQuery (582 lines) ka core flow,
ab ~150 lines mein, har step alag service se.

Pipeline (har step ka number response ke saath samajhne ke liye):

    1. Chat resolve/create        (naya chat = title question se)
    2. Guardrail check            (blocked -> canned response, LLM/retrieval skip)
    3. Memory: condense question  (history ho to follow-up -> standalone)
    4. Retrieve                   (vectorstore + RBAC SearchFilter from AuthContext)
    5. Prompt build               (registry template + context stuffing)
    6. Generate                   (LLM provider — koi regex parsing nahi!)
    7. Persist                    (Conversation + ConversationSources)

Old system se ek bara farq: answer <answer> tags + regex se parse hota tha.
ChatBedrockConverse structured response deta hai — woh fragile parsing poori
delete ho gayi.
"""

import logging
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass, field

import shortuuid
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.core.auth import AuthContext
from src.domain.enums import SecurityLevel
from src.infrastructure.db.models import Chat, ChatSession, Conversation, ConversationSource
from src.prompts.registry import get_prompt
from src.rag.factory import RagComponents
from src.rag.vectorstore.base import ScoredDocument, SearchFilter
from src.services.guardrail_service import GuardrailService
from src.services.memory_service import MemoryService

log = logging.getLogger(__name__)


class RagChatService:
    def __init__(self, db: AsyncSession, rag: RagComponents):
        self.db = db
        self.rag = rag
        self.memory = MemoryService(db, rag)
        self.guardrail = GuardrailService(rag)

    # ---------- public entrypoints ----------

    async def chat(
        self,
        ctx: AuthContext,
        question: str,
        external_chat_id: str | None = None,
        is_regenerate: bool = False,
    ) -> dict:
        """Non-streaming (HTTP) — Phase 3."""
        started = time.time()
        prep = await self._prepare(ctx, question, external_chat_id)

        if prep.blocked_response is not None:
            answer = prep.blocked_response
        else:
            answer = await self.rag.llm_provider.generate(self.rag.model, prep.prompt)

        convo = await self._persist(
            prep.chat, ctx, question, answer, prep.docs, time.time() - started, is_regenerate
        )
        return self._response(prep.chat, convo, prep.docs)

    async def chat_stream(
        self,
        ctx: AuthContext,
        question: str,
        external_chat_id: str | None = None,
        is_regenerate: bool = False,
    ) -> AsyncIterator[dict]:
        """
        Streaming (SSE/WS) — Phase 4. Event protocol:
            {"event": "meta",    "data": {external_chat_id, title}}
            {"event": "token",   "data": {"text": "..."}}          # N dafa
            {"event": "sources", "data": [...]}
            {"event": "done",    "data": {external_conv_id, response_time}}
        Persistence stream COMPLETE hone ke baad hoti hai (partial answer save nahi).
        """
        started = time.time()
        prep = await self._prepare(ctx, question, external_chat_id)

        yield {"event": "meta", "data": {
            "external_chat_id": prep.chat.external_chat_id, "title": prep.chat.title,
        }}

        chunks: list[str] = []
        if prep.blocked_response is not None:
            chunks.append(prep.blocked_response)
            yield {"event": "token", "data": {"text": prep.blocked_response}}
        else:
            async for text in self.rag.llm_provider.stream(self.rag.model, prep.prompt):
                chunks.append(text)
                yield {"event": "token", "data": {"text": text}}

        yield {"event": "sources", "data": [
            {"content": d.document.page_content[:300], "metadata": d.document.metadata, "score": d.score}
            for d in prep.docs
        ]}

        convo = await self._persist(
            prep.chat, ctx, question, "".join(chunks), prep.docs,
            time.time() - started, is_regenerate,
        )
        yield {"event": "done", "data": {
            "external_conv_id": convo.external_conv_id,
            "response_time": convo.response_time,
        }}

    # ---------- shared pipeline (steps 1-5) ----------

    async def _prepare(
        self, ctx: AuthContext, question: str, external_chat_id: str | None
    ) -> "PipelinePrep":
        s = get_settings()

        # 1. chat resolve/create
        chat = await self._get_or_create_chat(ctx, question, external_chat_id)

        # 2. guardrail
        if s.ENABLE_GUARDRAILS:
            result = await self.guardrail.check(question)
            if not result.allowed:
                return PipelinePrep(chat=chat, blocked_response=result.response)

        # 3. memory
        retrieval_query = question
        if s.ENABLE_CHAT_MEMORY and external_chat_id:
            history = await self.memory.get_history(chat.external_chat_id)
            retrieval_query = await self.memory.condense_question(question, history)

        # 4. retrieve (RBAC yahan enforce hota hai)
        docs = await self.rag.vectorstore.search(
            retrieval_query, k=s.RETRIEVAL_TOP_K, filters=self._filters_from_ctx(ctx)
        )

        # 5. prompt
        context = "\n\n---\n\n".join(d.document.page_content for d in docs) or "No context found."
        prompt = get_prompt("rag_answer").format(context=context, question=retrieval_query)
        return PipelinePrep(chat=chat, docs=docs, prompt=prompt)

    # ---------- steps ----------

    def _filters_from_ctx(self, ctx: AuthContext) -> SearchFilter:
        s = get_settings()
        clearance = SecurityLevel(ctx.security_clearance.lower())
        return SearchFilter(
            security_levels=clearance.allowed_levels(),
            # Department filter opt-in hai: tab hi on karo jab ingestion har doc
            # pe department_id stamp karti ho (Phase 5) — warna sab exclude ho jata
            department_id=(
                str(ctx.department_id)
                if s.ENABLE_DEPARTMENT_FILTER and ctx.department_id is not None
                else None
            ),
        )

    async def _get_or_create_chat(
        self, ctx: AuthContext, question: str, external_chat_id: str | None
    ) -> Chat:
        if external_chat_id:
            from sqlalchemy import select

            result = await self.db.execute(
                select(Chat).where(Chat.external_chat_id == external_chat_id)
            )
            chat = result.scalars().first()
            if chat:
                return chat

        s = get_settings()
        chat = Chat(
            external_chat_id=shortuuid.uuid(),
            title=question[:255],
            model=s.LLM_MODEL_ID,
            email=ctx.email,
            brand_id=str(ctx.brand_id or ""),
        )
        self.db.add(chat)
        await self.db.flush()
        self.db.add(ChatSession(external_chat_id=chat.external_chat_id, session_id=ctx.session_id))
        await self.db.flush()
        return chat

    async def _persist(
        self,
        chat: Chat,
        ctx: AuthContext,
        question: str,
        answer: str,
        docs: list[ScoredDocument],
        response_time: float,
        is_regenerate: bool,
    ) -> Conversation:
        convo = Conversation(
            external_chat_id=chat.external_chat_id,
            question=question,
            answer=answer,
            session_id=ctx.session_id,
            response_time=round(response_time, 3),
            is_regenerate=is_regenerate,
        )
        self.db.add(convo)
        await self.db.flush()

        for d in docs:
            self.db.add(
                ConversationSource(
                    conversation_id=convo.id,
                    distance=float(d.score or 0.0),
                    doc_metadata=d.document.metadata or None,
                )
            )
        await self.db.flush()
        return convo

    @staticmethod
    def _response(chat: Chat, convo: Conversation, docs: list[ScoredDocument]) -> dict:
        return {
            "external_chat_id": chat.external_chat_id,
            "external_conv_id": convo.external_conv_id,
            "title": chat.title,
            "answer": convo.answer,
            "response_time": convo.response_time,
            "sources": [
                {"content": d.document.page_content[:300], "metadata": d.document.metadata, "score": d.score}
                for d in docs
            ],
        }


@dataclass
class PipelinePrep:
    """Steps 1-5 ka result — HTTP aur streaming dono isko consume karte hain."""

    chat: Chat
    docs: list[ScoredDocument] = field(default_factory=list)
    prompt: str = ""
    blocked_response: str | None = None