'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import type { AdminUser } from '@/core/api/types';
import { useUsers } from '../hooks/useUsers';
import { useDeleteUser } from '../hooks/useUserMutations';
import { UserFormDialog } from './UserFormDialog';

export function UsersTable() {
  const { data, isLoading, error, refetch } = useUsers();
  const deleteUser = useDeleteUser();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  const columns: Column<AdminUser>[] = [
    { header: 'Name', render: (u) => `${u.first_name} ${u.last_name}` },
    { header: 'Email', render: (u) => u.email },
    { header: 'Role', render: (u) => u.role ?? '—' },
    {
      header: 'Status',
      render: (u) => <Chip size="small" label={u.status ?? 'unknown'} color={u.status === 'active' ? 'success' : 'default'} />,
    },
    {
      header: '',
      width: 96,
      render: (u) => (
        <Stack direction="row">
          <IconButton size="small" onClick={() => { setEditing(u); setFormOpen(true); }} aria-label="edit">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => setDeleting(u)} aria-label="delete">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="People with access to the dashboard"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setFormOpen(true); }}>Invite user</Button>}
      />
      <DataTable
        rows={data ?? []}
        columns={columns}
        getRowKey={(u) => u.id}
        loading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        emptyTitle="No users yet"
      />
      <UserFormDialog open={formOpen} initial={editing} onClose={() => { setFormOpen(false); setEditing(null); }} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove user"
        message={`Remove ${deleting?.first_name} ${deleting?.last_name}'s access? This cannot be undone.`}
        confirmLabel="Remove"
        loading={deleteUser.isPending}
        onConfirm={async () => {
          if (deleting) await deleteUser.mutateAsync(deleting.id);
          setDeleting(null);
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
