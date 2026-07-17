"""Deterministic fake embeddings — pgvector flow ko AWS/Ollama ke bagair
test karne ke liye. Same text = same vector (deterministic), is liye
similarity search meaningful rehti hai testing mein."""

from langchain_core.embeddings import Embeddings
from langchain_core.embeddings.fake import DeterministicFakeEmbedding

from src.rag.embed.base import EmbeddingProvider, register_embedder


@register_embedder("fake")
class FakeEmbeddingProvider(EmbeddingProvider):
    def get_embeddings(self, model_id: str, **kwargs) -> Embeddings:
        return DeterministicFakeEmbedding(size=int(kwargs.get("size", 384)))