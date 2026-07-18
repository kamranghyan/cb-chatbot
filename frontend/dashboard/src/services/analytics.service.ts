import { apiClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type { ApiResponse, AnalyticsSummary, AnalyticsDailyPoint } from '../core/api/types';

export const getAnalyticsSummary = (): Promise<ApiResponse<AnalyticsSummary>> =>
  apiClient.get(ENDPOINTS.analytics.summary);

export const getAnalyticsDaily = (days = 14): Promise<ApiResponse<AnalyticsDailyPoint[]>> =>
  apiClient.get(ENDPOINTS.analytics.daily(days));
