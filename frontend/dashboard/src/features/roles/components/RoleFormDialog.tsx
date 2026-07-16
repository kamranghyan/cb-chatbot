'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import type { Role } from '@/core/api/types';

const PERMISSIONS = ['full_access', 'read', 'write', 'create', 'delete'];

interface RoleFormDialogProps {
  open: boolean;
  initial?: Role | null;
  saving?: boolean;
  onSave: (values: Omit<Role, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

export function RoleFormDialog({ open, initial, saving, onSave, onClose }: RoleFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setPermissions(initial?.permissions ?? []);
  }, [initial, open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ id: initial?.id, name, description, permissions });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{initial ? 'Edit role' : 'Add role'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth />
          <Autocomplete
            multiple
            options={PERMISSIONS}
            value={permissions}
            onChange={(_, v) => setPermissions(v)}
            renderInput={(params) => <TextField {...params} label="Permissions" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
