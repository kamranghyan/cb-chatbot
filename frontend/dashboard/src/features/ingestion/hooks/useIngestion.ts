'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ingestionService } from '@/services';
import type { IngestTextPayload, IngestS3Payload } from '@/core/api/types';

const KEY = ['ingestion', 'list'];

export function useIngestionList() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => ingestionService.listIngestions().then((res) => res.data),
    refetchInterval: 8000, // status moves PENDING -> PROCESSING -> COMPLETED async
  });
}

export function useIngestText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: IngestTextPayload) => ingestionService.ingestText(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useIngestFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, meta }: { file: File; meta: { security_level?: string; department_id?: string } }) =>
      ingestionService.ingestFile(file, meta),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useIngestS3() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: IngestS3Payload) => ingestionService.ingestS3(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
