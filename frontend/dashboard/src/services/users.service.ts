/**
 * MOCK-ONLY — this backend has no /users endpoints (see backend README's
 * API Overview table). Wired to mockOnlyClient so the Users screen keeps
 * working for demo/UI purposes. Once real endpoints exist, change
 * `mockOnlyClient` -> `apiClient` here and nowhere else.
 */
import { mockOnlyClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type { AdminUser, ApiResponse } from '../core/api/types';

export const createUser = (payload: Partial<AdminUser>): Promise<ApiResponse<AdminUser>> =>
  mockOnlyClient.post(ENDPOINTS.users.root, payload);

export const listUsers = (): Promise<ApiResponse<AdminUser[]>> =>
  mockOnlyClient.get(ENDPOINTS.users.list);

export const updateUser = (
  payload: Partial<AdminUser> & { customerid: string },
): Promise<ApiResponse<AdminUser>> => {
  const { customerid, ...body } = payload;
  return mockOnlyClient.patch(ENDPOINTS.users.update(customerid), body);
};

export const deleteUser = (userId: string): Promise<ApiResponse<void>> =>
  mockOnlyClient.delete(ENDPOINTS.users.update(userId));

export const getUserRoles = (): Promise<ApiResponse<string[]>> =>
  mockOnlyClient.get(ENDPOINTS.users.rolesList);
