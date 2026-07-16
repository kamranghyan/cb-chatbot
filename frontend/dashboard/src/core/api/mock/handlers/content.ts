import type { RouteDef } from '../mockAdapter';
import type { ContentItem } from '../../types';
import { contentFixture } from '../fixtures/content';

let items: ContentItem[] = JSON.parse(JSON.stringify(contentFixture));

export const contentHandlers: RouteDef[] = [
  { route: 'GET /ingestion-metadata', handler: () => ({ data: items }) },
  {
    route: 'POST /ingestion-metadata',
    handler: ({ body }) => {
      const payload = body as Partial<ContentItem>;
      const created: ContentItem = {
        external_uid: `c-${Date.now()}`,
        title: payload.title ?? 'Untitled',
        source_type: payload.source_type ?? 'document',
        status: 'pending',
        url: payload.url,
        brand: payload.brand,
        created_at: new Date().toISOString(),
        // Real backend returns a presigned S3 URL for the file upload step.
        presigned_url: 'https://mock-s3.local/upload/mock-presigned-url',
      };
      items.push(created);
      return { status: 201, data: created };
    },
  },
  {
    route: 'GET /ingestion-metadata/verify-website',
    handler: ({ query }) => ({ data: { url: query.get('url'), valid: true, pages_found: 12 } }),
  },
  {
    route: 'GET /ingestion-metadata/:uid',
    handler: ({ params }) => {
      const item = items.find((i) => i.external_uid === params.uid);
      return item ? { data: item } : { status: 404, data: { message: 'Content not found' } };
    },
  },
  {
    route: 'PATCH /ingestion-metadata/:uid',
    handler: ({ params, body }) => {
      const idx = items.findIndex((i) => i.external_uid === params.uid);
      if (idx === -1) return { status: 404, data: { message: 'Content not found' } };
      items[idx] = { ...items[idx], ...(body as Partial<ContentItem>) };
      return { data: items[idx] };
    },
  },
  {
    route: 'DELETE /ingestion-metadata/:uid',
    handler: ({ params }) => {
      items = items.filter((i) => i.external_uid !== params.uid);
      return { status: 204, data: null };
    },
  },
  { route: 'POST /ingestion-metadata/sync-knowledgebase/:uid', handler: () => ({ data: { status: 'sync_started' } }) },
  { route: 'POST /ingestion-metadata/download', handler: () => ({ data: { download_url: 'https://mock-s3.local/download/mock-file.pdf' } }) },
];
