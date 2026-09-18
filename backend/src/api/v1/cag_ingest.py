"""
CAG ingestion — separate from src/api/v1/ingestion.py (RAG pipeline).
Uploads .md directly to the tenant's S3 CAG prefix and refreshes that
tenant's Redis cache. Does not go through IngestionService/pgvector.
"""

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

from src.core.auth import RequireAdmin
from src.rag.ingest.providers.cag_s3 import upload_doc
from src.services.cag_service import warm_load_tenant

router = APIRouter()


class CagIngestIn(BaseModel):
    filename: str
    content: str


@router.post("/{brand_id}/ingest")
async def cag_ingest(brand_id: str, body: CagIngestIn, ctx: RequireAdmin):
    """JSON body — for when content is generated/already in memory."""
    if not body.filename.endswith(".md"):
        body.filename += ".md"
    key = await upload_doc(brand_id, body.filename, body.content)
    reloaded = await warm_load_tenant(brand_id)
    return {"s3_key": key, "brand_id": brand_id, "docs_in_cache": reloaded}


@router.post("/{brand_id}/ingest-file")
async def cag_ingest_file(brand_id: str, ctx: RequireAdmin, file: UploadFile = File(...)):
    """Multipart upload — for when you actually have a .md file on disk."""
    filename = file.filename or "upload.md"
    if not filename.endswith(".md"):
        filename += ".md"
    data = await file.read()
    content = data.decode("utf-8")
    key = await upload_doc(brand_id, filename, content)
    reloaded = await warm_load_tenant(brand_id)
    return {"s3_key": key, "brand_id": brand_id, "docs_in_cache": reloaded}