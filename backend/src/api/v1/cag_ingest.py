"""
CAG ingestion — separate from src/api/v1/ingestion.py (RAG pipeline).
Uploads .md directly to the tenant's S3 CAG prefix and refreshes that
tenant's Redis cache. Does not go through IngestionService/pgvector.
"""

import logging
from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

from src.core.auth import RequireAdmin
from src.infrastructure.cache import cag_cache
from src.rag.ingest.providers.cag_s3 import upload_doc

log = logging.getLogger(__name__)

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
    doc_id = body.filename.removesuffix(".md")
    await cag_cache.set_doc(brand_id, doc_id, body.content)  # direct write — we already have the content, no need to re-fetch from S3
    log.info("CAG cache invalidated/updated: %s/%s", brand_id, doc_id)
    return {"s3_key": key, "brand_id": brand_id, "doc_id": doc_id}


@router.post("/{brand_id}/ingest-file")
async def cag_ingest_file(brand_id: str, ctx: RequireAdmin, file: UploadFile = File(...)):
    """Multipart upload — for when you actually have a .md file on disk."""
    filename = file.filename or "upload.md"
    if not filename.endswith(".md"):
        filename += ".md"
    data = await file.read()
    content = data.decode("utf-8")
    key = await upload_doc(brand_id, filename, content)
    doc_id = filename.removesuffix(".md")
    await cag_cache.set_doc(brand_id, doc_id, content)  # direct write — we already have the content, no need to re-fetch from S3
    log.info("CAG cache invalidated/updated: %s/%s", brand_id, doc_id)
    return {"s3_key": key, "brand_id": brand_id, "doc_id": doc_id}  