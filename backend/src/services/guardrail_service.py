"""
Guardrail — old system mein guardrail prompt + hardcoded canned responses
rag_query.py ke andar the. Ab standalone, pluggable step:
.env: ENABLE_GUARDRAILS=false karo to poora step skip.
"""

import logging
from dataclasses import dataclass

from src.prompts.registry import get_prompt
from src.rag.factory import RagComponents

log = logging.getLogger(__name__)

BLOCKED_RESPONSE = (
    "I'm sorry, I can't help with that topic. "
    "Please ask me something related to our products or services."
)


@dataclass
class GuardrailResult:
    allowed: bool
    response: str | None = None  # blocked hone pe canned response


class GuardrailService:
    def __init__(self, rag: RagComponents):
        self.rag = rag

    async def check(self, question: str) -> GuardrailResult:
        prompt = get_prompt("guardrail").format(question=question)
        try:
            decision = (await self.rag.llm_provider.generate(self.rag.model, prompt)).strip().upper()
        except Exception as e:
            log.warning("Guardrail check failed, allowing by default: %s", e)
            return GuardrailResult(allowed=True)

        if "BLOCK" in decision:
            log.info("Guardrail BLOCKED question: %r", question)
            return GuardrailResult(allowed=False, response=BLOCKED_RESPONSE)
        return GuardrailResult(allowed=True)