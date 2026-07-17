"""Fake LLM — zero-dependency local testing (na AWS, na Ollama chahiye).
.env: LLM_PROVIDER=fake. Streaming bhi simulate karta hai (word-by-word)."""

from langchain_core.language_models import BaseLanguageModel
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from src.rag.llm.base import LLMProvider, register_llm


@register_llm("fake")
class FakeLLMProvider(LLMProvider):
    def get_model(self, model_id: str, **kwargs) -> BaseLanguageModel:
        return FakeListChatModel(
            responses=[
                "Yeh fake LLM ka jawab hai — pipeline plumbing test ke liye. "
                "Asli model ke liye .env mein LLM_PROVIDER=bedrock ya ollama set karo."
            ]
        )