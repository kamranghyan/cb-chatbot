/**
 * Roles service — REAL implementation over the central client.
 * Replaces the old src/admin/api/role.ts which faked responses with a
 * mutable in-memory object inside the API file (the exact anti-pattern this
 * architecture removes). Fake data now lives ONLY in the mock layer.
 */
import { apiClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type { Role, Paginated, ApiResponse } from '../core/api/types';

export const listRoles = (): Promise<ApiResponse<Paginated<Role>>> =>
  apiClient.get(ENDPOINTS.roles.root);

export const getRoleById = (roleId: string): Promise<ApiResponse<Role>> =>
  apiClient.get(ENDPOINTS.roles.byId(roleId));

export const addRole = (payload: Omit<Role, 'id'>): Promise<ApiResponse<Role>> =>
  apiClient.post(ENDPOINTS.roles.root, payload);

export const updateRole = (payload: Role): Promise<ApiResponse<Role>> =>
  apiClient.put(ENDPOINTS.roles.byId(payload.id), payload);

export const deleteRole = (roleId: string): Promise<ApiResponse<void>> =>
  apiClient.delete(ENDPOINTS.roles.byId(roleId));
