"""Ollama provider — local dev AWS ke bagair (aur multi-model proof:
naya provider = yeh ek file, business code untouched)."""

from langchain_core.language_models import BaseLanguageModel
from langchain_ollama import ChatOllama

from src.rag.llm.base import LLMProvider, register_llm


@register_llm("ollama")
class OllamaLLMProvider(LLMProvider):
    def get_model(self, model_id: str, **kwargs) -> BaseLanguageModel:
        return ChatOllama(
            model=model_id,  # e.g. "phi4-mini", "llama3.2"
            temperature=kwargs.get("temperature", 0.0),
            base_url=kwargs.get("base_url", "http://host.docker.internal:11434"),
        )