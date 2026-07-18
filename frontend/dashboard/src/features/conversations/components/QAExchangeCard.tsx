'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ThumbUpIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownIcon from '@mui/icons-material/ThumbDownOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { QAExchange } from '@/core/api/types';

const snippet = (text: string, n = 50) => (text.length > n ? `${text.slice(0, n)}…` : text);

export function QAExchangeCard({ exchange }: { exchange: QAExchange }) {
  const unanswered = !exchange.answer;

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, mb: 1.5, borderColor: unanswered ? 'warning.main' : 'divider', borderWidth: unanswered ? 2 : 1 }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">Question</Typography>
        <Typography variant="caption" color="text.secondary">{new Date(exchange.created_at).toLocaleString()}</Typography>
      </Stack>
      <Typography variant="body1" sx={{ mb: 1.5 }}>{exchange.question}</Typography>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Answer</Typography>
      {unanswered ? (
        <Chip icon={<HelpOutlineIcon />} label="Unanswered — not available in knowledge base" color="warning" size="small" />
      ) : (
        <Typography variant="body1">{exchange.answer}</Typography>
      )}

      {exchange.sources.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1.5 }}>
          {exchange.sources.map((s, si) => (
            <Tooltip key={si} title={s.content}>
              <Chip size="small" variant="outlined" label={`Source: ${snippet(s.content, 30)}`} />
            </Tooltip>
          ))}
        </Stack>
      )}

      {exchange.reaction && (
        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          {exchange.reaction.liked && <Chip icon={<ThumbUpIcon />} label="User marked helpful" size="small" color="success" variant="outlined" />}
          {exchange.reaction.disliked && <Chip icon={<ThumbDownIcon />} label="User marked not helpful" size="small" color="error" variant="outlined" />}
          {exchange.reaction.comment && <Typography variant="caption" color="text.secondary">"{exchange.reaction.comment}"</Typography>}
        </Box>
      )}
    </Paper>
  );
}
