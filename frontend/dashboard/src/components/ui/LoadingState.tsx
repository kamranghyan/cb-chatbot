'use client';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 6, justifyContent: 'center' }}>
      <CircularProgress size={22} />
      <span>{label}</span>
    </Box>
  );
}
