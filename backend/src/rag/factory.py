"""
RAG factory — .env ki values ko concrete providers se jorta hai.

Yeh WAHID jagah hai jahan provider selection hoti hai. Services isko
FastAPI dependency ke through use karengi:

    @router.post("/chat")
    async def chat(rag: RagComponents = Depends(get_rag_components)): ...

Phase 2 mein providers/ modules import hote hi register ho jayenge
(decorator side-effect). Abhi registries khali hain — app phir bhi
boot hoti hai kyunki components lazy resolve hote hain.
"""

from dataclasses import dataclass
from functools import lru_cache

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel

from src.config import get_settings
from src.rag.embed.base import EmbeddingProvider, get_embedding_provider
from src.rag.llm.base import LLMProvider, get_llm_provider
from src.rag.vectorstore.base import VectorStoreProvider, get_vectorstore_provider

# Phase 2: yahan providers import honge taake register ho jayein, e.g.
# import src.rag.llm.providers.bedrock  # noqa: F401
# import src.rag.embed.providers.bedrock_cohere  # noqa: F401
# import src.rag.vectorstore.providers.pgvector  # noqa: F401


@dataclass
class RagComponents:
    llm_provider: LLMProvider
    model: BaseChatModel
    embeddings: Embeddings
    vectorstore: VectorStoreProvider


@lru_cache(maxsize=1)
def get_rag_components() -> RagComponents:
    s = get_settings()

    llm_provider = get_llm_provider(s.LLM_PROVIDER)()
    model = llm_provider.get_model(s.LLM_MODEL_ID)

    embed_provider: EmbeddingProvider = get_embedding_provider(s.EMBED_PROVIDER)()
    embeddings = embed_provider.get_embeddings(s.EMBED_MODEL_ID)

    store = get_vectorstore_provider(s.VECTORSTORE_PROVIDER)(
        embeddings=embeddings, settings=s
    )

    return RagComponents(
        llm_provider=llm_provider,
        model=model,
        embeddings=embeddings,
        vectorstore=store,
    )
