'use client';

import { useQuery } from '@tanstack/react-query';
import { usersService } from '@/services';
import { queryKeys } from '@/lib/queryKeys';

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => usersService.listUsers().then((res) => res.data),
  });
}
