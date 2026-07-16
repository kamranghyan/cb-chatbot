import { apiClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type { ApiResponse } from '../core/api/types';

export interface AnalyticsSummary {
  total_conversations: number;
  total_users: number;
  avg_accuracy: number;
  avg_response_ms: number;
  conversations_by_day: { date: string; count: number }[];
}

export const getAnalyticsSummary = (): Promise<ApiResponse<AnalyticsSummary>> =>
  apiClient.get(ENDPOINTS.analytics.summary);
