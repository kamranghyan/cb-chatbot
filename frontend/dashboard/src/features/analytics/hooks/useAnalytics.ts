'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services';

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => analyticsService.getAnalyticsSummary().then((res) => res.data),
    staleTime: 60_000, // matches backend's 60s Redis cache TTL
  });
}

export function useAnalyticsDaily(days: number) {
  return useQuery({
    queryKey: ['analytics', 'daily', days],
    queryFn: () => analyticsService.getAnalyticsDaily(days).then((res) => res.data),
  });
}

/** Local UI state for the days-range selector. */
export function useDailyRange(initial = 14) {
  return useState(initial);
}
