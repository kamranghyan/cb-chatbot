import { apiClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type { ApiResponse, ContentItem } from '../core/api/types';

export const listContent = (): Promise<ApiResponse<ContentItem[]>> =>
  apiClient.get(ENDPOINTS.content.root);

export const addContent = (payload: Partial<ContentItem>): Promise<ApiResponse<ContentItem>> =>
  apiClient.post(ENDPOINTS.content.root, payload);

export const getContentById = (uid: string): Promise<ApiResponse<ContentItem>> =>
  apiClient.get(ENDPOINTS.content.byId(uid));

export const updateContent = (payload: Partial<ContentItem>, uid: string): Promise<ApiResponse<ContentItem>> =>
  apiClient.patch(ENDPOINTS.content.byId(uid), payload);

export const deleteContent = (uid: string): Promise<ApiResponse<void>> =>
  apiClient.delete(ENDPOINTS.content.byId(uid));

export const syncBedrockKB = (uid: string): Promise<ApiResponse<unknown>> =>
  apiClient.post(ENDPOINTS.content.syncKnowledgeBase(uid));

export const validateURL = (url: string): Promise<ApiResponse<unknown>> =>
  apiClient.get(ENDPOINTS.content.verifyWebsite(url));
