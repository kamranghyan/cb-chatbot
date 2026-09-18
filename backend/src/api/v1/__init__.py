from fastapi import APIRouter

from src.api.v1.analytics import router as analytics_router
from src.api.v1.auth import router as auth_router
from src.api.v1.chat import router as chat_router
from src.api.v1.health import router as health_router
from src.api.v1.ingestion import router as ingestion_router
from src.api.v1.rag_debug import router as rag_debug_router
from src.api.v1.cag_debug import router as cag_debug_router
from src.api.v1.cag_ingest import router as cag_ingest_router


api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
api_router.include_router(chat_router, prefix="/api/v1/chat", tags=["Chat"])
api_router.include_router(rag_debug_router, prefix="/api/v1/rag", tags=["RAG Debug (local)"])
api_router.include_router(ingestion_router, prefix="/api/v1/ingestion", tags=["Ingestion"])
api_router.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
api_router.include_router(cag_debug_router, prefix="/api/v1/cag", tags=["CAG Debug (local)"])
api_router.include_router(cag_ingest_router, prefix="/api/v1/cag", tags=["CAG Ingest"])