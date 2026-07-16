'use client';

import { useQuery } from '@tanstack/react-query';
import { contentService } from '@/services';
import { queryKeys } from '@/lib/queryKeys';

export function useContent() {
  return useQuery({
    queryKey: queryKeys.content.all,
    queryFn: () => contentService.listContent().then((res) => res.data),
  });
}
