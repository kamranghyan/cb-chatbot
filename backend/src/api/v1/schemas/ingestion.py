"""Ingestion schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from src.domain.enums import IngestionStatus, SecurityLevel


class IngestTextIn(BaseModel):
    text: str = Field(min_length=1)
    name: str = Field(default="inline-text", max_length=255)
    security_level: SecurityLevel = SecurityLevel.PUBLIC
    department_id: str | None = None


class IngestS3In(BaseModel):
    s3_key: str
    security_level: SecurityLevel = SecurityLevel.PUBLIC
    department_id: str | None = None


class PresignedUrlIn(BaseModel):
    filename: str


class IngestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    external_uid: str
    source_type: str | None
    source_path: str | None
    status: IngestionStatus
    chunk_count: int | None = None
    error: str | None = None
    security_level: SecurityLevel
    created_at: datetime