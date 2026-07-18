'use client';

/**
 * Admin Conversation Management Dashboard.
 * Left: users who have chatted with the AI. Right: that user's full
 * conversation history — every question, every answer (or "Unanswered"),
 * every reported issue and its solution (if any).
 *
 * This is NOT a chat interface — there is no message box to send new
 * questions here. Admins only review what already happened.
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { UsersList } from './UsersList';
import { ThreadDetail } from './ThreadDetail';
import { useUserThreads } from '../hooks/useConversations';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

export function ConversationsDashboard() {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const { data: threads, isLoading, error, refetch } = useUserThreads(selectedEmail);

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 112px)', border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <UsersList selectedEmail={selectedEmail} onSelect={setSelectedEmail} />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {!selectedEmail && (
          <EmptyState title="Select a user" hint="Choose a user from the list to review their conversation history." />
        )}
        {selectedEmail && isLoading && <LoadingState label="Loading conversation history…" />}
        {selectedEmail && error && <ErrorState error={error as Error} onRetry={() => refetch()} />}
        {selectedEmail && threads && threads.length === 0 && (
          <EmptyState title="No conversations yet" hint="This user has not started any conversations." />
        )}
        {selectedEmail && threads && threads.length > 0 && (
          <>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Conversation history — {threads[0].email}
            </Typography>
            {threads.map((t) => <ThreadDetail key={t.external_chat_id} thread={t} />)}
          </>
        )}
      </Box>
    </Box>
  );
}
