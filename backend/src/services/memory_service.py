"""
Chat memory — old rag_query.py ke condensation block ka standalone service.

Kaam: pichli N conversations DB se utha kar follow-up question ko
"standalone question" mein convert karna (LLM se), taake retrieval sahi ho.
Example: "aur uski price?" -> "Basmati rice ki price kya hai?"
"""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.infrastructure.db.models import Conversation
from src.prompts.registry import get_prompt
from src.rag.factory import RagComponents

log = logging.getLogger(__name__)


class MemoryService:
    def __init__(self, db: AsyncSession, rag: RagComponents):
        self.db = db
        self.rag = rag

    async def get_history(self, external_chat_id: str) -> list[Conversation]:
        s = get_settings()
        result = await self.db.execute(
            select(Conversation)
            .where(Conversation.external_chat_id == external_chat_id)
            .order_by(Conversation.id.desc())
            .limit(s.CHAT_HISTORY_NO_OF_MSGS)
        )
        return list(reversed(result.scalars().all()))  # chronological

    async def condense_question(self, question: str, history: list[Conversation]) -> str:
        """History ho to standalone question banao, warna question as-is."""
        if not history:
            return question

        history_text = "\n".join(
            f"Human: {c.question}\nAssistant: {c.answer}" for c in history if c.question
        )
        prompt = get_prompt("condense_question").format(history=history_text, question=question)

        try:
            standalone = await self.rag.llm_provider.generate(self.rag.model, prompt)
            standalone = standalone.strip()
            log.info("Condensed question: %r -> %r", question, standalone)
            return standalone or question
        except Exception as e:
            # Memory failure poora chat na girae — original question se aage barho
            log.warning("Condensation failed, using original question: %s", e)
            return question