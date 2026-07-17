"""
Ingestion routes — ADMIN only (old system: sirf role check tha, ab RequireAdmin).

    POST /api/v1/ingestion/text          direct text -> pipeline
    POST /api/v1/ingestion/file          multipart upload -> pipeline
    POST /api/v1/ingestion/s3            S3 key -> download -> pipeline
    POST /api/v1/ingestion/presigned-url upload URL (old flow ka port)
    GET  /api/v1/ingestion/list          status tracking
"""

import asyncio
from typing import Annotated

import boto3
from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.schemas.ingestion import (
    IngestionOut,
    IngestS3In,
    IngestTextIn,
    PresignedUrlIn,
)
from src.config import get_settings
from src.core.auth import RequireAdmin
from src.domain.enums import SecurityLevel
from src.infrastructure.db.session import get_db
from src.rag.factory import get_rag_components
from src.services.ingestion_service import IngestionService

router = APIRouter()

DB = Annotated[AsyncSession, Depends(get_db)]


@router.post("/text", response_model=IngestionOut)
async def ingest_text(body: IngestTextIn, ctx: RequireAdmin, db: DB):
    svc = IngestionService(db, get_rag_components())
    return await svc.ingest_text(ctx, body.text, body.name, body.security_level, body.department_id)


@router.post("/file", response_model=IngestionOut)
async def ingest_file(
    ctx: RequireAdmin,
    db: DB,
    file: UploadFile = File(...),
    security_level: SecurityLevel = Form(SecurityLevel.PUBLIC),
    department_id: str | None = Form(None),
):
    data = await file.read()
    svc = IngestionService(db, get_rag_components())
    return await svc.ingest_file(ctx, file.filename or "upload", data, security_level, department_id)


@router.post("/s3", response_model=IngestionOut)
async def ingest_s3(body: IngestS3In, ctx: RequireAdmin, db: DB):
    svc = IngestionService(db, get_rag_components())
    return await svc.ingest_s3(ctx, body.s3_key, body.security_level, body.department_id)


@router.post("/presigned-url")
async def presigned_url(body: PresignedUrlIn, ctx: RequireAdmin):
    """Bare file S3 pe direct upload karne ke liye URL (old flow) —
    upload ke baad /ingestion/s3 call karo usi key ke saath."""
    s = get_settings()
    client = boto3.client("s3", region_name=s.AWS_DEFAULT_REGION)
    key = f"uploads/{body.filename}"
    url = await asyncio.to_thread(
        client.generate_presigned_url,
        "put_object",
        Params={"Bucket": s.S3_BUCKET, "Key": key},
        ExpiresIn=900,
    )
    return {"upload_url": url, "s3_key": key, "expires_in": 900}


@router.get("/list", response_model=list[IngestionOut])
async def list_ingestions(ctx: RequireAdmin, db: DB):
    return await IngestionService(db, get_rag_components()).list_ingestions()