"""
CAG S3 loader — tenant-scoped .md discovery under clients/{brand_id}/cag/.
Kept fully separate from src/rag/ingest/providers/s3.py (the RAG ingestion
loader) — not registered in the loader registry, not touched by IngestionService.
"""

import asyncio
import logging

import boto3

from src.config import get_settings

log = logging.getLogger(__name__)

CAG_ROOT_PREFIX = "clients"


def _client():
    s = get_settings()
    return boto3.client("s3", region_name=s.AWS_DEFAULT_REGION)


async def discover_tenant_ids() -> list[str]:
    """List brand_id folders under clients/ via a delimiter listing (cheap)."""
    s = get_settings()
    if not s.S3_BUCKET:
        return []
    client = _client()
    resp = await asyncio.to_thread(
        client.list_objects_v2,
        Bucket=s.S3_BUCKET,
        Prefix=f"{CAG_ROOT_PREFIX}/",
        Delimiter="/",
    )
    prefixes = resp.get("CommonPrefixes", [])
    return [p["Prefix"].split("/")[1] for p in prefixes if p.get("Prefix")]


async def list_tenant_docs(brand_id: str) -> list[str]:
    s = get_settings()
    if not s.S3_BUCKET:
        return []
    client = _client()
    prefix = f"{CAG_ROOT_PREFIX}/{brand_id}/cag/"
    resp = await asyncio.to_thread(client.list_objects_v2, Bucket=s.S3_BUCKET, Prefix=prefix)
    return [obj["Key"] for obj in resp.get("Contents", []) if obj["Key"].endswith(".md")]


async def load_doc(key: str) -> str:
    s = get_settings()
    client = _client()
    obj = await asyncio.to_thread(client.get_object, Bucket=s.S3_BUCKET, Key=key)
    return obj["Body"].read().decode("utf-8")


async def upload_doc(brand_id: str, filename: str, content: str) -> str:
    """Not wired anywhere yet — for the future /ingest CAG extension."""
    s = get_settings()
    client = _client()
    key = f"{CAG_ROOT_PREFIX}/{brand_id}/cag/{filename}"
    await asyncio.to_thread(client.put_object, Bucket=s.S3_BUCKET, Key=key, Body=content.encode("utf-8"))
    return key