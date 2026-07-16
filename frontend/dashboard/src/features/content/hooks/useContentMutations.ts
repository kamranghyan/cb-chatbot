'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contentService } from '@/services';
import { queryKeys } from '@/lib/queryKeys';
import type { ContentItem } from '@/core/api/types';

export function useAddContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ContentItem>) => contentService.addContent(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.content.all }),
  });
}

export function useUpdateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, payload }: { uid: string; payload: Partial<ContentItem> }) =>
      contentService.updateContent(payload, uid),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.content.all }),
  });
}

export function useDeleteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => contentService.deleteContent(uid),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.content.all }),
  });
}

export function useSyncKnowledgeBase() {
  return useMutation({
    mutationFn: (uid: string) => contentService.syncBedrockKB(uid),
  });
}

export function useValidateWebsite() {
  return useMutation({
    mutationFn: (url: string) => contentService.validateURL(url).then((res) => res.data),
  });
}
