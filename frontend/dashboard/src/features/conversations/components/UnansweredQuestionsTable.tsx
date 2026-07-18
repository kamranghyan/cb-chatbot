'use client';

import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import type { UnansweredQuestionRow } from '@/core/api/types';
import { useUnansweredQuestions } from '../hooks/useConversations';

const columns: Column<UnansweredQuestionRow>[] = [
  { header: 'User', render: (r) => r.user_name },
  { header: 'Question', render: (r) => r.question },
  { header: 'Asked', render: (r) => new Date(r.created_at).toLocaleString() },
];

export function UnansweredQuestionsTable() {
  const { data, isLoading, error, refetch } = useUnansweredQuestions();
  return (
    <>
      <PageHeader
        title="Unanswered Questions"
        subtitle="Questions the AI could not answer — review these to see what's missing from the knowledge base"
      />
      <DataTable
        rows={data ?? []}
        columns={columns}
        getRowKey={(r) => r.external_conv_id}
        loading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        emptyTitle="No unanswered questions 🎉"
      />
    </>
  );
}
