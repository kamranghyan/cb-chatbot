from fastapi import APIRouter

from src.config import get_settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health():
    s = get_settings()
    return {
        "status": "ok",
        "env": s.ENV,
        "providers": {
            "llm": s.LLM_PROVIDER,
            "embeddings": s.EMBED_PROVIDER,
            "vectorstore": s.VECTORSTORE_PROVIDER,
        },
    }
