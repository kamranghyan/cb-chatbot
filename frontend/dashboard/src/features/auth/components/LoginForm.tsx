'use client';

import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useAuth } from '../hooks/useAuth';
import { ENV } from '@/core/config/env';

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      setError('Sign-in failed. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 4, width: 380 }} variant="outlined">
      <Typography variant="h5" fontWeight={700} gutterBottom>Sign in</Typography>
      {ENV.USE_MOCK_API && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Mock mode: any email/password works.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth />
        <Button type="submit" variant="contained" size="large" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </Box>
    </Paper>
  );
}
