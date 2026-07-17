"""
Embeddings port. Provider LangChain `Embeddings` instance return karta hai.
Old system: CohereV3 / ParaphraseMpnetV2 hardcoded if/else in controller.
"""

from abc import ABC, abstractmethod
from typing import Callable

from langchain_core.embeddings import Embeddings

_REGISTRY: dict[str, type["EmbeddingProvider"]] = {}


def register_embedder(name: str) -> Callable:
    def deco(cls):
        _REGISTRY[name] = cls
        return cls
    return deco


def get_embedding_provider(name: str) -> type["EmbeddingProvider"]:
    if name not in _REGISTRY:
        raise KeyError(f"Unknown embedding provider '{name}'. Registered: {list(_REGISTRY)}")
    return _REGISTRY[name]


class EmbeddingProvider(ABC):
    @abstractmethod
    def get_embeddings(self, model_id: str, **kwargs) -> Embeddings:
        """Configured LangChain Embeddings return karo."""
