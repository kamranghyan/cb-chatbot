'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services';

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => analyticsService.getAnalyticsSummary().then((res) => res.data),
  });
}
