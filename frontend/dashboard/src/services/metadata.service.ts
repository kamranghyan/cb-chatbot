/** MOCK-ONLY — not part of this backend. Kept for the (currently unused) departments fixture. */
import { mockOnlyClient } from '../core/api/client';
import type { ApiResponse, Department } from '../core/api/types';

export const getDepartments = (): Promise<ApiResponse<Department[]>> =>
  mockOnlyClient.get('/departments/list');
