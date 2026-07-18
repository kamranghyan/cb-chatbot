'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import type { ConversationIssue } from '@/core/api/types';

export function IssuePanel({ issue }: { issue: ConversationIssue }) {
  return (
    <Alert severity={issue.resolved ? 'success' : 'error'} sx={{ mb: 2 }}>
      <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        Issue reported
        <Chip size="small" label={issue.resolved ? 'Resolved' : 'Open'} color={issue.resolved ? 'success' : 'error'} />
      </AlertTitle>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        <strong>{issue.category}{issue.sub_category ? ` · ${issue.sub_category}` : ''}</strong>
      </Typography>
      {issue.description && <Typography variant="body2" sx={{ mb: 1 }}>{issue.description}</Typography>}
      {issue.resolution ? (
        <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2">Solution</Typography>
          <Typography variant="body2">{issue.resolution}</Typography>
        </Box>
      ) : (
        !issue.resolved && <Typography variant="caption" color="text.secondary">No solution recorded yet.</Typography>
      )}
    </Alert>
  );
}
