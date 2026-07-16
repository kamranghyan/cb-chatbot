import { apiClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type { ApiResponse, Department } from '../core/api/types';

export const getDepartments = (): Promise<ApiResponse<Department[]>> =>
  apiClient.get(ENDPOINTS.metadata.departments);
