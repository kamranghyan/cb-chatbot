"""
CAG debug endpoints — local-only, same pattern as rag_debug.py.

    POST /api/v1/cag/warm-load               -> re-run warm-load, all tenants
    POST /api/v1/cag/{brand_id}/warm-load     -> re-run for one tenant
    GET  /api/v1/cag/{brand_id}/docs          -> list cached docs + preview
"""

from fastapi import APIRouter

from src.config import get_settings
from src.core.exceptions import NotFoundError
from src.infrastructure.cache import cag_cache
from src.services.cag_service import select_context
from src.services.context_builder import build_cag_context
from src.services.cag_service import warm_load_all, warm_load_tenant

router = APIRouter()


def _local_only() -> None:
    if not get_settings().is_local:
        raise NotFoundError()


@router.post("/warm-load")
async def cag_warm_load():
    _local_only()
    await warm_load_all()
    return {"status": "done"}


@router.post("/{brand_id}/warm-load")
async def cag_warm_load_tenant(brand_id: str):
    _local_only()
    count = await warm_load_tenant(brand_id)
    return {"brand_id": brand_id, "loaded": count}


@router.get("/{brand_id}/docs")
async def cag_list_docs(brand_id: str):
    _local_only()
    docs = await cag_cache.get_all_docs(brand_id)
    return {"brand_id": brand_id, "doc_count": len(docs), "docs": {k: v[:200] for k, v in docs.items()}}


@router.get("/{brand_id}/select")
async def cag_select(brand_id: str, question: str):
    _local_only()
    selected = await select_context(question, brand_id)
    return {
        "brand_id": brand_id,
        "question": question,
        "matched_docs": list(selected.keys()),
        "context_preview": build_cag_context(selected)[:500],
    }