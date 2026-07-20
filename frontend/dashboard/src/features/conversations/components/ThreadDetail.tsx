'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { UserConversationThread } from '@/core/api/types';
import { QAExchangeCard } from './QAExchangeCard';
import { IssuePanel } from './IssuePanel';

export function ThreadDetail({ thread }: { thread: UserConversationThread }) {
  const unansweredCount = thread.exchanges.filter((e) => !e.answer).length;

  return (
    <Box sx={{ mb: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>{thread.title}</Typography>
        {unansweredCount > 0 && (
          <Chip size="small" color="warning" label={`${unansweredCount} unanswered`} />
        )}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {new Date(thread.created_at).toLocaleString()}
        </Typography>
      </Stack>

      {thread.issue && <IssuePanel issue={thread.issue} />}

      {thread.exchanges.map((ex) => (
        <QAExchangeCard key={ex.external_conv_id} exchange={ex} />
      ))}
    </Box>
  );
}
