"""
S3 loader — AWS path: file pehle presigned URL se S3 pe upload hoti hai
(old system ka flow), phir yahan se download ho kar FileLoader ko delegate.
"""

import asyncio
from typing import Any

import boto3
from langchain_core.documents import Document

from src.config import get_settings
from src.rag.ingest.base import DocumentLoader, register_loader
from src.rag.ingest.providers.file import FileLoader


@register_loader("s3")
class S3Loader(DocumentLoader):
    async def load(self, source: str, metadata: dict[str, Any] | None = None) -> list[Document]:
        """source = S3 object key (e.g. 'uploads/manual.pdf')."""
        s = get_settings()
        client = boto3.client("s3", region_name=s.AWS_DEFAULT_REGION)
        obj = await asyncio.to_thread(client.get_object, Bucket=s.S3_BUCKET, Key=source)
        data = obj["Body"].read()
        filename = source.rsplit("/", 1)[-1]
        return await FileLoader().load_bytes(filename, data, metadata)