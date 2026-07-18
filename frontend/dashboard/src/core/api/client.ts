/**
 * API CLIENT — the single HTTP gateway of the application.
 *
 * Base URL, headers, auth, interceptors and the mock/real switch all live
 * here. This is the ONLY file that creates an axios instance for backend
 * calls. A second dashboard reuses this whole core/ folder untouched and
 * supplies its own .env values.
 *
 * MOCK vs REAL
 * ------------
 * ENV.USE_MOCK_API=true  → requests served by src/core/api/mock.
 * ENV.USE_MOCK_API=false → requests hit ENV.API_BASE_URL.
 * Nothing else in the codebase changes between the two modes.
 */
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { ENV } from '../config/env';
import { requestInterceptor, responseInterceptor, errorInterceptor } from './interceptors';
import { mockAdapter } from './mock/mockAdapter';

export const apiClient: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  ...(ENV.USE_MOCK_API ? { adapter: mockAdapter } : {}),
});

apiClient.interceptors.request.use(requestInterceptor);
apiClient.interceptors.response.use(responseInterceptor, errorInterceptor);

if (ENV.USE_MOCK_API && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.info(
    '%c[api] MOCK MODE — responses served from src/core/api/mock. ' +
      'Set NEXT_PUBLIC_USE_MOCK_API=false to use the real backend.',
    'color:#8b5cf6;font-weight:bold',
  );
}

/** Bare instance for direct-to-S3 presigned uploads (no baseURL, no auth header). */
export const uploadClient: AxiosInstance = axios.create({
  headers: { 'Content-Type': 'text/plain' },
});

/**
 * ALWAYS-MOCK client for domains this backend does not implement
 * (Users, Roles — see core/api/endpoints.ts). Used regardless of
 * ENV.USE_MOCK_API so these screens keep working for demo purposes
 * instead of throwing 404s against the real backend. Swap this to
 * `apiClient` once real /users and /roles endpoints exist.
 */
export const mockOnlyClient: AxiosInstance = axios.create({
  baseURL: 'http://mock.local',
  adapter: mockAdapter,
});
