'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminUser } from '@/core/api/types';

export function useUserRoles() {
  return useQuery({
    queryKey: ['users', 'roles-list'],
    queryFn: () => usersService.getUserRoles().then((res) => res.data),
  });
}

export function useAddUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AdminUser>) => usersService.createUser(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AdminUser> & { customerid: string }) => usersService.updateUser(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => usersService.deleteUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}
