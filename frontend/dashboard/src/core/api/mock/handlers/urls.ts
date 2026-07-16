import type { RouteDef } from '../mockAdapter';
import type { UrlItem } from '../../types';
import { urlsFixture } from '../fixtures/urls';

let urls: UrlItem[] = JSON.parse(JSON.stringify(urlsFixture));

export const urlHandlers: RouteDef[] = [
  { route: 'POST /api/url/list-url', handler: () => ({ data: urls }) },
  {
    route: 'GET /api/url/get-url-by-id',
    handler: ({ query }) => {
      const found = urls.find((u) => u.id === Number(query.get('id')));
      return found ? { data: found } : { status: 404, data: { message: 'URL not found' } };
    },
  },
  {
    route: 'POST /api/url/create',
    handler: ({ body }) => {
      const created = { id: Date.now(), ...(body as Partial<UrlItem>) } as UrlItem;
      urls.push(created);
      return { status: 201, data: created };
    },
  },
  {
    route: 'PUT /api/url/update-url',
    handler: ({ body }) => {
      const payload = body as UrlItem;
      const idx = urls.findIndex((u) => u.id === payload.id);
      if (idx === -1) return { status: 404, data: { message: 'URL not found' } };
      urls[idx] = { ...urls[idx], ...payload };
      return { data: urls[idx] };
    },
  },
  {
    route: 'DELETE /api/url/delete/:id',
    handler: ({ params }) => {
      urls = urls.filter((u) => u.id !== Number(params.id));
      return { status: 204, data: null };
    },
  },
];
