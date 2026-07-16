import { apiClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type { ApiResponse, UrlItem } from '../core/api/types';

export const getURLById = (id: number): Promise<ApiResponse<UrlItem>> =>
  apiClient.get(ENDPOINTS.urls.byId(id));

export const createURL = (payload: Partial<UrlItem>): Promise<ApiResponse<UrlItem>> =>
  apiClient.post(ENDPOINTS.urls.create, payload);

export const updateURL = (payload: UrlItem): Promise<ApiResponse<UrlItem>> =>
  apiClient.put(ENDPOINTS.urls.update, payload);

export const deleteURL = (id: number): Promise<ApiResponse<void>> =>
  apiClient.delete(ENDPOINTS.urls.remove(id));

export const listURLs = (queryString = ''): Promise<ApiResponse<UrlItem[]>> =>
  apiClient.post(queryString ? `${ENDPOINTS.urls.list}?${queryString}` : ENDPOINTS.urls.list);
