import type { RouteDef } from '../mockAdapter';
import { ingestionListFixture } from '../fixtures/ingestion';

let items = JSON.parse(JSON.stringify(ingestionListFixture)) as typeof ingestionListFixture;

export const ingestionHandlers: RouteDef[] = [
  { route: 'GET /api/v1/ingestion/list', handler: () => ({ data: items }) },
  {
    route: 'POST /api/v1/ingestion/text',
    handler: ({ body }) => {
      const payload = body as { name?: string; security_level?: string };
      const created = { external_uid: `ing-${Date.now()}`, source_type: 'text', source_path: payload?.name ?? 'inline-text', status: 'PENDING' as const, chunk_count: null, error: null, security_level: (payload?.security_level ?? 'PUBLIC') as any, created_at: new Date().toISOString() };
      items.push(created);
      return { status: 201, data: created };
    },
  },
  {
    route: 'POST /api/v1/ingestion/file',
    handler: () => {
      const created = { external_uid: `ing-${Date.now()}`, source_type: 'file', source_path: 'uploaded-file', status: 'PENDING' as const, chunk_count: null, error: null, security_level: 'PUBLIC' as const, created_at: new Date().toISOString() };
      items.push(created);
      return { status: 201, data: created };
    },
  },
  {
    route: 'POST /api/v1/ingestion/s3',
    handler: ({ body }) => {
      const payload = body as { s3_key?: string; security_level?: string };
      const created = { external_uid: `ing-${Date.now()}`, source_type: 's3', source_path: payload?.s3_key ?? 'unknown', status: 'PENDING' as const, chunk_count: null, error: null, security_level: (payload?.security_level ?? 'PUBLIC') as any, created_at: new Date().toISOString() };
      items.push(created);
      return { status: 201, data: created };
    },
  },
  {
    route: 'POST /api/v1/ingestion/presigned-url',
    handler: ({ body }) => {
      const payload = body as { filename?: string };
      return { data: { upload_url: 'https://mock-s3.local/upload/mock-presigned-url', s3_key: `uploads/${payload?.filename ?? 'file'}` } };
    },
  },
];
