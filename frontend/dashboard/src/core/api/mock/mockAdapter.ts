/**
 * MOCK ADAPTER — a drop-in replacement for axios' network transport.
 *
 * HOW IT WORKS
 * ------------
 * Axios lets you swap the thing that actually sends the request (the
 * "adapter"). When ENV.USE_MOCK_API is true, the api client uses THIS
 * function instead of the browser's XHR/fetch. Everything else — request
 * interceptors, auth headers, response interceptors, error handling,
 * `res.data` shapes — behaves exactly as with a real backend.
 *
 * That is why the UI "does not know" where data comes from: the seam is
 * below every layer the UI can see.
 *
 * WHY NOT static JSON in components?
 * ----------------------------------
 * Static JSON skips the entire request pipeline: no latency, no loading
 * states, no error paths, no auth, and a different code path you must rip
 * out later. This adapter exercises the real pipeline and disappears by
 * flipping one env flag.
 */
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
import { ENV } from '../../config/env';
import { handlers } from './handlers';

export interface MockRequest {
  method: string;
  /** path without query string, e.g. /chat/list */
  path: string;
  /** parsed query params */
  query: URLSearchParams;
  /** parsed JSON body (if any) */
  body: unknown;
  /** named params captured from the route pattern, e.g. { id: '3' } */
  params: Record<string, string>;
}

export interface MockReply {
  status?: number;
  data: unknown;
}

export type MockHandler = (req: MockRequest) => MockReply | Promise<MockReply>;

export interface RouteDef {
  /** e.g. 'GET /chat/:threadId' — segments starting with ':' are captured */
  route: string;
  handler: MockHandler;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Matches '/chat/123' against '/chat/:threadId' → { threadId: '123' } */
const matchPath = (pattern: string, path: string): Record<string, string> | null => {
  const p = pattern.split('/').filter(Boolean);
  const a = path.split('/').filter(Boolean);
  if (p.length !== a.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i += 1) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
};

export const mockAdapter = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
  const method = (config.method ?? 'get').toUpperCase();
  const url = new URL(config.url ?? '', config.baseURL || 'http://mock.local');
  const path = url.pathname;
  const query = url.searchParams;

  let body: unknown = null;
  if (typeof config.data === 'string') {
    try { body = JSON.parse(config.data); } catch { body = config.data; }
  } else {
    body = config.data ?? null;
  }

  await wait(ENV.MOCK_LATENCY_MS);

  for (const { route, handler } of handlers) {
    const [routeMethod, routePattern] = route.split(' ');
    if (routeMethod !== method) continue;
    const params = matchPath(routePattern, path);
    if (!params) continue;

    const reply = await handler({ method, path, query, body, params });
    const status = reply.status ?? 200;

    const response: AxiosResponse = {
      data: reply.data,
      status,
      statusText: status < 400 ? 'OK' : 'Error',
      headers: {},
      config: config as never,
    };

    if (status >= 400) {
      throw new AxiosError(
        `Mock request failed with status ${status}`,
        String(status),
        config as never,
        null,
        response,
      );
    }

    // eslint-disable-next-line no-console
    console.info(`%c[mock] ${method} ${path} → ${status}`, 'color:#8b5cf6');
    return response;
  }

  throw new AxiosError(
    `[mock] No handler registered for "${method} ${path}". Add one in src/core/api/mock/handlers/.`,
    '501',
    config as never,
  );
};
