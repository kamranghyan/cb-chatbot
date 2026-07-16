'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import type { ContentItem } from '@/core/api/types';
import { useContent } from '../hooks/useContent';
import { useDeleteContent, useSyncKnowledgeBase } from '../hooks/useContentMutations';
import { ContentFormDialog } from './ContentFormDialog';

export function ContentTable() {
  const { data, isLoading, error, refetch } = useContent();
  const deleteContent = useDeleteContent();
  const syncKb = useSyncKnowledgeBase();

  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<ContentItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const columns: Column<ContentItem>[] = [
    { header: 'Title', render: (c) => c.title },
    { header: 'Type', render: (c) => c.source_type },
    { header: 'Brand', render: (c) => c.brand ?? '—' },
    {
      header: 'Status',
      render: (c) => (
        <Chip size="small" label={c.status ?? 'unknown'} color={c.status === 'synced' ? 'success' : 'warning'} />
      ),
    },
    {
      header: '',
      width: 96,
      render: (c) => (
        <>
          <Tooltip title="Sync to knowledge base">
            <IconButton
              size="small"
              disabled={syncKb.isPending}
              onClick={async () => { await syncKb.mutateAsync(c.external_uid); setToast('Sync started'); }}
            >
              <SyncIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={() => setDeleting(c)} aria-label="delete">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Content"
        subtitle="Documents, websites and videos in the knowledge base"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>Add content</Button>}
      />
      <DataTable
        rows={data ?? []}
        columns={columns}
        getRowKey={(c) => c.external_uid}
        loading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        emptyTitle="No content ingested yet"
      />
      <ContentFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete content"
        message={`Delete "${deleting?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteContent.isPending}
        onConfirm={async () => {
          if (deleting) await deleteContent.mutateAsync(deleting.external_uid);
          setDeleting(null);
        }}
        onClose={() => setDeleting(null)}
      />
      <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast(null)} message={toast} />
    </>
  );
}
