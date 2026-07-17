"""Ollama embeddings — local dev (e.g. bge-m3, nomic-embed-text)."""

from langchain_core.embeddings import Embeddings
from langchain_ollama import OllamaEmbeddings

from src.rag.embed.base import EmbeddingProvider, register_embedder


@register_embedder("ollama")
class OllamaEmbeddingProvider(EmbeddingProvider):
    def get_embeddings(self, model_id: str, **kwargs) -> Embeddings:
        return OllamaEmbeddings(
            model=model_id, base_url=kwargs.get("base_url", "http://localhost:11434")
        )