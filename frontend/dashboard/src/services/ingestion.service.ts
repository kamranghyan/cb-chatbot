/**
 * Exact match: src/api/v1/schemas/ingestion.py
 * NOTE: there is no separate Pydantic schema for the file-upload endpoint
 * (multipart/form-data can't use a JSON body schema directly) — its Form()
 * fields are assumed to mirror IngestTextIn (name, security_level,
 * department_id). Confirm against the ingestion router if this 422s too.
 */
import { apiClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type {
  ApiResponse,
  IngestTextPayload,
  IngestS3Payload,
  PresignedUrlPayload,
  PresignedUrlResponse,
  IngestionItem,
  CagIngestResponse,
  CagDocsResponse,
} from '../core/api/types';

export const ingestText = (payload: IngestTextPayload): Promise<ApiResponse<IngestionItem>> =>
  apiClient.post(ENDPOINTS.ingestion.text, payload);

/**
 * file: txt / md / pdf, multipart/form-data.
 * Confirmed against api/v1/ingestion.py: the endpoint's Form() params are
 * ONLY security_level and department_id — there is no `name` field. The
 * backend uses `file.filename` automatically as the source name.
 */
export const ingestFile = (
  file: File,
  meta: { security_level?: string; department_id?: string },
): Promise<ApiResponse<IngestionItem>> => {
  const form = new FormData();
  form.append('file', file);
  if (meta.security_level) form.append('security_level', meta.security_level);
  if (meta.department_id) form.append('department_id', meta.department_id);
  return apiClient.post(ENDPOINTS.ingestion.file, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const ingestS3 = (payload: IngestS3Payload): Promise<ApiResponse<IngestionItem>> =>
  apiClient.post(ENDPOINTS.ingestion.s3, payload);

export const getPresignedUrl = (payload: PresignedUrlPayload): Promise<ApiResponse<PresignedUrlResponse>> =>
  apiClient.post(ENDPOINTS.ingestion.presignedUrl, payload);

export const listIngestions = (): Promise<ApiResponse<IngestionItem[]>> =>
  apiClient.get(ENDPOINTS.ingestion.list);

// ============================================================================
// CAG — deliberately separate functions, not folded into the RAG calls
// above. Different destination (S3 + Redis, not pgvector), different
// response shape (CagIngestResponse, not IngestionItem — no chunking/
// embedding step, so there's no chunk_count/status to report).
// ============================================================================

export const ingestCagFile = (
  brandId: string,
  file: File,
): Promise<ApiResponse<CagIngestResponse>> => {
  const form = new FormData();
  form.append('file', file);
  return apiClient.post(ENDPOINTS.cag.ingestFile(brandId), form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const ingestCagText = (
  brandId: string,
  filename: string,
  content: string,
): Promise<ApiResponse<CagIngestResponse>> =>
  apiClient.post(ENDPOINTS.cag.ingestText(brandId), { filename, content });

/** Local-dev/debug only — cag_debug.py 404s outside AUTH_PROVIDER=local. */
export const getCagDocs = (brandId: string): Promise<ApiResponse<CagDocsResponse>> =>
  apiClient.get(ENDPOINTS.cag.docs(brandId));