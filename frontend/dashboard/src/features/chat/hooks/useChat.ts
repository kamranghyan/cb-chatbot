'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@/services';
import { queryKeys } from '@/lib/queryKeys';
import type { MessagePayload } from '@/core/api/types';

export function useThreads() {
  return useQuery({
    queryKey: queryKeys.chat.threads,
    queryFn: () => chatService.getThreadsList().then((res) => res.data),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MessagePayload) => chatService.addMessage(payload).then((res) => res.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.chat.threads }),
  });
}
