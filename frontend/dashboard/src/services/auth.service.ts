/**
 * Auth — this backend has NO email/password login. Local dev issues a
 * token from a single POST with just an email (see backend README:
 * "Get a token (local only)"). This endpoint is explicitly local-env-only
 * on the backend side — it will 404/403 against dev/qa/prod.
 */
import { apiClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type { ApiResponse, DevTokenResponse } from '../core/api/types';

export const getDevToken = (email: string): Promise<ApiResponse<DevTokenResponse>> =>
  apiClient.post(ENDPOINTS.auth.devToken, { email });
