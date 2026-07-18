'use client';

import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useAuth } from '../hooks/useAuth';

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email);
    } catch {
      setError('Could not get a token. Is the backend running (ENV=local)?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 4, width: 380 }} variant="outlined">
      <Typography variant="h5" fontWeight={700} gutterBottom>Sign in</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Local dev auth: enter any email to get a dev token. This only works
        when the backend is running with ENV=local.
      </Alert>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
        <Button type="submit" variant="contained" size="large" disabled={loading}>
          {loading ? 'Getting token…' : 'Continue'}
        </Button>
      </Box>
    </Paper>
  );
}
