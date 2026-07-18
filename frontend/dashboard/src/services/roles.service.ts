/**
 * MOCK-ONLY — this backend has no /roles endpoints (see backend README's
 * API Overview table). Wired to mockOnlyClient so the Roles screen keeps
 * working for demo/UI purposes. Once real endpoints exist, change
 * `mockOnlyClient` -> `apiClient` here and nowhere else.
 */
import { mockOnlyClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type { Role, Paginated, ApiResponse } from '../core/api/types';

export const listRoles = (): Promise<ApiResponse<Paginated<Role>>> =>
  mockOnlyClient.get(ENDPOINTS.roles.root);

export const getRoleById = (roleId: string): Promise<ApiResponse<Role>> =>
  mockOnlyClient.get(ENDPOINTS.roles.byId(roleId));

export const addRole = (payload: Omit<Role, 'id'>): Promise<ApiResponse<Role>> =>
  mockOnlyClient.post(ENDPOINTS.roles.root, payload);

export const updateRole = (payload: Role): Promise<ApiResponse<Role>> =>
  mockOnlyClient.put(ENDPOINTS.roles.byId(payload.id), payload);

export const deleteRole = (roleId: string): Promise<ApiResponse<void>> =>
  mockOnlyClient.delete(ENDPOINTS.roles.byId(roleId));
