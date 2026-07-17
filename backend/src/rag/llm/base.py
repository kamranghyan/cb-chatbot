"""
LLM port (interface).

LangChain-based design: har provider ek configured `BaseChatModel`
return karta hai. Streaming alag se implement nahi karni parti —
LangChain ka `.astream()` har chat model pe kaam karta hai, isi liye
Phase 4 (SSE/WS) mein service layer change nahi hoga.

Naya provider add karna (multi-model requirement):
    @register_llm("ollama")
    class OllamaProvider(LLMProvider): ...
aur .env mein LLM_PROVIDER=ollama — bas. Kahin aur koi if/else nahi
(old ModelController ka if model_type == "SageMaker" pattern khatam).
"""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Callable

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage

_REGISTRY: dict[str, type["LLMProvider"]] = {}


def register_llm(name: str) -> Callable[[type["LLMProvider"]], type["LLMProvider"]]:
    def deco(cls: type["LLMProvider"]) -> type["LLMProvider"]:
        _REGISTRY[name] = cls
        return cls

    return deco


def get_llm_provider(name: str) -> type["LLMProvider"]:
    if name not in _REGISTRY:
        raise KeyError(f"Unknown LLM provider '{name}'. Registered: {list(_REGISTRY)}")
    return _REGISTRY[name]


class LLMProvider(ABC):
    """Har concrete provider (bedrock/sagemaker/ollama) yeh implement karta hai."""

    @abstractmethod
    def get_model(self, model_id: str, **kwargs) -> BaseChatModel:
        """Configured LangChain chat model return karo."""

    # Convenience wrappers — services in ko call karein, direct model ko nahi,
    # taake tracing/tags/metadata ek jagah centralize rahein.
    async def generate(self, model: BaseChatModel, messages: list[BaseMessage], **cfg) -> str:
        result = await model.ainvoke(messages, config=cfg or None)
        return result.content if hasattr(result, "content") else str(result)

    async def stream(
        self, model: BaseChatModel, messages: list[BaseMessage], **cfg
    ) -> AsyncIterator[str]:
        async for chunk in model.astream(messages, config=cfg or None):
            text = chunk.content if hasattr(chunk, "content") else str(chunk)
            if text:
                yield text
