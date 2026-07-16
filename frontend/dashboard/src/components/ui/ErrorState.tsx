'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <Alert
      severity="error"
      action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : undefined}
      sx={{ my: 2 }}
    >
      {error.message || 'Something went wrong.'}
    </Alert>
  );
}
