from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Callable, Any

# Fix 1: Import correct types from LangChain core
from langchain_core.language_models import BaseChatModel
from langchain_core.language_models.base import LanguageModelInput

# Fix 2: Use string literal for forward reference before class definition
_REGISTRY: dict[str, type["LLMProvider"]] = {}

def register_llm(name: str) -> Callable[[type["LLMProvider"]], type["LLMProvider"]]:
    def deco(cls: type["LLMProvider"]) -> type["LLMProvider"]:
        _REGISTRY[name] = cls
        return cls
    return deco

def get_llm_provider(name: str) -> type["LLMProvider"]:
    if name not in _REGISTRY:
        raise KeyError(f"Unknown LLM provider '{name}'. Registered: {list(_REGISTRY.keys())}")
    return _REGISTRY[name]

class LLMProvider(ABC):
    """Har concrete provider (bedrock/sagemaker/ollama) yeh implement karta hai."""
    
    @abstractmethod
    def get_model(self, model_id: str, **kwargs: Any) -> BaseChatModel:
        """Configured LangChain chat model return karo."""
        pass

    @staticmethod
    def _extract_text(content: Any) -> str:
        """Provider-agnostic content normalization."""
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return "".join(
                block.get("text", "") 
                for block in content 
                if isinstance(block, dict) and block.get("type") == "text"
            )
        return str(content) if content else ""

    # Fix 3: Changed BaseLanguageModel -> BaseChatModel to match your architecture
    async def generate(self, model: BaseChatModel, messages: LanguageModelInput, **cfg: Any) -> str:
        result = await model.ainvoke(messages, config=cfg or None)
        return self._extract_text(getattr(result, "content", result))

    async def stream(
        self, model: BaseChatModel, messages: LanguageModelInput, **cfg: Any
    ) -> AsyncIterator[str]:
        async for chunk in model.astream(messages, config=cfg or None):
            text = self._extract_text(getattr(chunk, "content", chunk))
            if text:
                yield text
