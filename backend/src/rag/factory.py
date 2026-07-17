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

# Providers import = registration (decorator side-effect). Heavy SDK imports
# lazy rehte hain kyunki har provider apne get_* call pe hi client banata hai.
import src.rag.llm.providers.bedrock  # noqa: E402, F401
import src.rag.llm.providers.sagemaker  # noqa: E402, F401
import src.rag.llm.providers.ollama  # noqa: E402, F401
import src.rag.llm.providers.fake  # noqa: E402, F401
import src.rag.embed.providers.bedrock  # noqa: E402, F401
import src.rag.embed.providers.ollama  # noqa: E402, F401
import src.rag.embed.providers.fake  # noqa: E402, F401
import src.rag.vectorstore.providers.pgvector  # noqa: E402, F401
import src.rag.vectorstore.providers.bedrock_kb  # noqa: E402, F401
import src.rag.chunk.providers.recursive  # noqa: E402, F401
import src.rag.ingest.providers.text  # noqa: E402, F401
import src.rag.ingest.providers.file  # noqa: E402, F401
import src.rag.ingest.providers.s3  # noqa: E402, F401


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