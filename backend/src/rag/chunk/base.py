"""
Chunker port. Old system mein chunking Bedrock KB ko delegated thi;
ab pgvector path ke liye in-app hogi (MAX_CHUNK_SIZE/CHUNK_OVERLAP .env se).
"""

from abc import ABC, abstractmethod
from typing import Callable

from langchain_core.documents import Document

_REGISTRY: dict[str, type["Chunker"]] = {}


def register_chunker(name: str) -> Callable:
    def deco(cls):
        _REGISTRY[name] = cls
        return cls
    return deco


def get_chunker(name: str) -> type["Chunker"]:
    if name not in _REGISTRY:
        raise KeyError(f"Unknown chunker '{name}'. Registered: {list(_REGISTRY)}")
    return _REGISTRY[name]


class Chunker(ABC):
    @abstractmethod
    def chunk(self, docs: list[Document]) -> list[Document]: ...
