"""
VectorStore port.

Do zimmedariyan:
  1. add_documents  — ingestion pipeline ka aakhri step
  2. search         — RBAC/brand filter ke saath retrieval

Note: Bedrock KB adapter mein add_documents "sync trigger" hoga
(KB khud chunk+embed karta hai), pgvector adapter mein real insert.
Yeh asymmetry adapter ke ANDAR chhupti hai — service ko farq nahi parta.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable

from langchain_core.documents import Document

_REGISTRY: dict[str, type["VectorStoreProvider"]] = {}


def register_vectorstore(name: str) -> Callable:
    def deco(cls):
        _REGISTRY[name] = cls
        return cls
    return deco


def get_vectorstore_provider(name: str) -> type["VectorStoreProvider"]:
    if name not in _REGISTRY:
        raise KeyError(f"Unknown vectorstore '{name}'. Registered: {list(_REGISTRY)}")
    return _REGISTRY[name]


@dataclass
class SearchFilter:
    """Old code ke bikhre hue RBAC/brand filters ka typed replacement."""

    security_levels: list[str] = field(default_factory=list)  # ["PUBLIC", "PRIVATE", ...]
    department_id: str | None = None
    brand_id: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class ScoredDocument:
    document: Document
    score: float | None = None


class VectorStoreProvider(ABC):
    @abstractmethod
    async def add_documents(self, docs: list[Document], **kwargs) -> list[str]: ...

    @abstractmethod
    async def search(
        self, query: str, k: int = 5, filters: SearchFilter | None = None
    ) -> list[ScoredDocument]: ...
