'use client';

/**
 * Table columns reflect the real IngestionOut shape: there is no `title`
 * field on this backend — `source_path` (or `source_type` as fallback) is
 * shown as the display name instead.
 */
import { useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import type { IngestionItem } from '@/core/api/types';
import { useIngestionList } from '../hooks/useIngestion';
import { IngestionFormDialog } from './IngestionFormDialog';

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  COMPLETED: 'success', PROCESSING: 'warning', PENDING: 'default', FAILED: 'error',
};

export function IngestionTable() {
  const { data, isLoading, error, refetch } = useIngestionList();
  const [formOpen, setFormOpen] = useState(false);

  const columns: Column<IngestionItem>[] = [
    { header: 'Source', render: (i) => i.source_path ?? i.source_type ?? i.external_uid },
    { header: 'Security', render: (i) => <Chip size="small" variant="outlined" label={i.security_level} /> },
    {
      header: 'Status',
      render: (i) => <Chip size="small" label={i.status} color={STATUS_COLOR[i.status] ?? 'default'} />,
    },
    { header: 'Chunks', render: (i) => i.chunk_count ?? '—' },
    { header: 'Created', render: (i) => new Date(i.created_at).toLocaleString() },
  ];

  return (
    <>
      <PageHeader
        title="Ingestion"
        subtitle="Documents in the knowledge base (auto-refreshes while processing)"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>Ingest content</Button>}
      />
      <DataTable
        rows={data ?? []}
        columns={columns}
        getRowKey={(i) => i.external_uid}
        loading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        emptyTitle="Nothing ingested yet"
      />
      <IngestionFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  );
}
