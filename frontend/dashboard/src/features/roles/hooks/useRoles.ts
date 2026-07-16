'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rolesService } from '@/services';
import { queryKeys } from '@/lib/queryKeys';
import type { Role } from '@/core/api/types';

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.roles.all,
    queryFn: () => rolesService.listRoles().then((res) => res.data.results),
  });
}

export function useAddRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Role, 'id'>) => rolesService.addRole(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roles.all }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Role) => rolesService.updateRole(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roles.all }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rolesService.deleteRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roles.all }),
  });
}
