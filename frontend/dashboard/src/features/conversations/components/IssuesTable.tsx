'use client';

import Chip from '@mui/material/Chip';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import type { IssueRow } from '@/core/api/types';
import { useIssues } from '../hooks/useConversations';

const columns: Column<IssueRow>[] = [
  { header: 'User', render: (r) => r.user_name },
  { header: 'Conversation', render: (r) => r.title },
  { header: 'Category', render: (r) => `${r.category}${r.sub_category ? ` · ${r.sub_category}` : ''}` },
  { header: 'Issue', render: (r) => r.description ?? '—' },
  {
    header: 'Status',
    render: (r) => <Chip size="small" label={r.resolved ? 'Resolved' : 'Open'} color={r.resolved ? 'success' : 'error'} />,
  },
  { header: 'Solution', render: (r) => r.resolution ?? '—' },
];

export function IssuesTable() {
  const { data, isLoading, error, refetch } = useIssues();
  return (
    <>
      <PageHeader title="Issues" subtitle="Problems users reported and whether they've been resolved" />
      <DataTable
        rows={data ?? []}
        columns={columns}
        getRowKey={(r) => r.external_chat_id}
        loading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        emptyTitle="No issues reported"
      />
    </>
  );
}
