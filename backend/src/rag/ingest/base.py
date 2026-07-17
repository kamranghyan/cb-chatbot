"""
Loader port — raw source (S3 file, URL, upload) -> LangChain Documents.
Pipeline: Loader -> Chunker -> Embeddings -> VectorStore (Phase 5).
"""

from abc import ABC, abstractmethod
from typing import Any, Callable

from langchain_core.documents import Document

_REGISTRY: dict[str, type["DocumentLoader"]] = {}


def register_loader(name: str) -> Callable:
    def deco(cls):
        _REGISTRY[name] = cls
        return cls
    return deco


def get_loader(name: str) -> type["DocumentLoader"]:
    if name not in _REGISTRY:
        raise KeyError(f"Unknown loader '{name}'. Registered: {list(_REGISTRY)}")
    return _REGISTRY[name]


class DocumentLoader(ABC):
    @abstractmethod
    async def load(self, source: str, metadata: dict[str, Any] | None = None) -> list[Document]: ...
