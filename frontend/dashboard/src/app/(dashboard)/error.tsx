'use client';

/**
 * Next.js error boundary for the dashboard route group. Catches render
 * errors in any admin/chat screen and offers a retry instead of a blank page.
 */
import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <Box sx={{ py: 8, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <Box sx={{ maxWidth: 480 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Something went wrong</Typography>
        <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>{error.message || 'Unexpected error'}</Alert>
        <Button variant="contained" onClick={reset}>Try again</Button>
      </Box>
    </Box>
  );
}
