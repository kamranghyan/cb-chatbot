'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { AdminUser } from '@/core/api/types';
import { useAddUser, useUpdateUser, useUserRoles } from '../hooks/useUserMutations';

interface UserFormDialogProps {
  open: boolean;
  initial?: AdminUser | null;
  onClose: () => void;
}

export function UserFormDialog({ open, initial, onClose }: UserFormDialogProps) {
  const { data: roles } = useUserRoles();
  const addUser = useAddUser();
  const updateUser = useUpdateUser();
  const saving = addUser.isPending || updateUser.isPending;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(initial?.first_name ?? '');
    setLastName(initial?.last_name ?? '');
    setEmail(initial?.email ?? '');
    setRole(initial?.role ?? '');
    setError(null);
  }, [initial, open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (initial) {
        await updateUser.mutateAsync({ customerid: initial.id, first_name: firstName, last_name: lastName, role });
      } else {
        await addUser.mutateAsync({ first_name: firstName, last_name: lastName, email, role });
      }
      onClose();
    } catch {
      setError('Could not save user. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{initial ? 'Edit user' : 'Invite user'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required fullWidth />
          <TextField label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required fullWidth />
          <TextField
            label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            required fullWidth disabled={Boolean(initial)}
            helperText={initial ? 'Email cannot be changed' : undefined}
          />
          <TextField select label="Role" value={role} onChange={(e) => setRole(e.target.value)} required fullWidth>
            {(roles ?? []).map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Send invite'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
