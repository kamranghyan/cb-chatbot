'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function EmptyState({ title = 'Nothing here yet', hint }: { title?: string; hint?: string }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
      <Typography variant="h6">{title}</Typography>
      {hint ? <Typography variant="body2">{hint}</Typography> : null}
    </Box>
  );
}
