import { apiClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type { ApiResponse } from '../core/api/types';
import type { UserSession } from '../core/api/session';

export const login = (email: string, password: string): Promise<ApiResponse<UserSession>> =>
  apiClient.post(ENDPOINTS.auth.login, { email, password });

export const refreshToken = (): Promise<ApiResponse<Pick<UserSession, 'accessToken'>>> =>
  apiClient.post(ENDPOINTS.auth.refreshToken);
