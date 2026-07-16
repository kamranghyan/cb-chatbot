import { apiClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type { AdminUser, ApiResponse } from '../core/api/types';

export const createUser = (payload: Partial<AdminUser>): Promise<ApiResponse<AdminUser>> =>
  apiClient.post(ENDPOINTS.users.root, payload);

export const getUserByEmail = (email: string): Promise<ApiResponse<AdminUser>> =>
  apiClient.get(ENDPOINTS.users.byEmail(email));

export const getUserById = (userId: string): Promise<ApiResponse<AdminUser>> =>
  apiClient.get(ENDPOINTS.users.byId(userId));

export const listUsers = (params: Record<string, string | number> = {}): Promise<ApiResponse<AdminUser[]>> => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return apiClient.get(qs ? `${ENDPOINTS.users.list}?${qs}` : ENDPOINTS.users.list);
};

export const listBots = (params: Record<string, string | number> = {}): Promise<ApiResponse<AdminUser[]>> => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return apiClient.get(qs ? `${ENDPOINTS.users.bots}?${qs}` : ENDPOINTS.users.bots);
};

export const userChatSessions = (
  userId: string,
  page?: number,
  perPage?: number,
): Promise<ApiResponse<unknown>> => {
  const qs = new URLSearchParams({ external_user_id: userId });
  if (page) qs.set('page', String(page));
  if (perPage) qs.set('per_page', String(perPage));
  return apiClient.get(`${ENDPOINTS.users.sessionList}?${qs.toString()}`);
};

export const updateUser = (
  payload: Partial<AdminUser> & { customerid: string },
): Promise<ApiResponse<AdminUser>> => {
  const { customerid, ...body } = payload;
  // Old version forgot to return the promise, so callers could not await it. Fixed.
  return apiClient.patch(ENDPOINTS.users.update(customerid), body);
};

export const getUserRoles = (): Promise<ApiResponse<string[]>> =>
  apiClient.get(ENDPOINTS.users.rolesList);

export const deleteUser = (userId: string): Promise<ApiResponse<void>> =>
  apiClient.delete(ENDPOINTS.users.update(userId));
