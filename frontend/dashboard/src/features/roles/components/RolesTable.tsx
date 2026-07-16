'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Role } from '@/core/api/types';
import { useRoles, useAddRole, useUpdateRole, useDeleteRole } from '../hooks/useRoles';
import { RoleFormDialog } from './RoleFormDialog';

export function RolesTable() {
  const { data, isLoading, error, refetch } = useRoles();
  const addRole = useAddRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);

  const columns: Column<Role>[] = [
    { header: 'Name', render: (r) => r.name },
    { header: 'Description', render: (r) => r.description },
    {
      header: 'Permissions',
      render: (r) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {r.permissions.map((p) => <Chip key={p} size="small" label={p} />)}
        </Stack>
      ),
    },
    {
      header: '',
      width: 96,
      render: (r) => (
        <Stack direction="row">
          <IconButton size="small" onClick={() => { setEditing(r); setFormOpen(true); }} aria-label="edit">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => setDeleting(r)} aria-label="delete">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const handleSave = async (values: Omit<Role, 'id'> & { id?: string }) => {
    if (values.id) await updateRole.mutateAsync(values as Role);
    else await addRole.mutateAsync(values);
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Roles"
        subtitle="Access roles and their permissions"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            Add role
          </Button>
        }
      />
      <DataTable
        rows={data ?? []}
        columns={columns}
        getRowKey={(r) => r.id}
        loading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        emptyTitle="No roles defined"
      />
      <RoleFormDialog
        open={formOpen}
        initial={editing}
        saving={addRole.isPending || updateRole.isPending}
        onSave={handleSave}
        onClose={() => { setFormOpen(false); setEditing(null); }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete role"
        message={`Delete role "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteRole.isPending}
        onConfirm={async () => {
          if (deleting) await deleteRole.mutateAsync(deleting.id);
          setDeleting(null);
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
