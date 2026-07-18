'use client';

import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { useMemo, useState } from 'react';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import type { ConversationUser } from '@/core/api/types';
import { useConversationUsers } from '../hooks/useConversations';

interface UsersListProps {
  selectedEmail: string | null;
  onSelect: (email: string) => void;
}

const initials = (u: ConversationUser) => `${u.first_name[0] ?? ''}${u.last_name[0] ?? ''}`.toUpperCase();

export function UsersList({ selectedEmail, onSelect }: UsersListProps) {
  const { data, isLoading, error, refetch } = useConversationUsers();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.toLowerCase();
    return data.filter((u) => `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <Box sx={{ width: 320, borderRight: 1, borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Users</Typography>
        <TextField
          size="small" fullWidth placeholder="Search users…" value={query} onChange={(e) => setQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {isLoading && <LoadingState />}
        {error && <ErrorState error={error as Error} onRetry={() => refetch()} />}
        <List disablePadding>
          {filtered.map((u) => (
            <ListItemButton key={u.email} selected={u.email === selectedEmail} onClick={() => onSelect(u.email)} alignItems="flex-start">
              <ListItemAvatar>
                <Badge badgeContent={u.unanswered_count} color="warning" overlap="circular">
                  <Avatar>{initials(u)}</Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={`${u.first_name} ${u.last_name}`}
                secondary={
                  <>
                    <Typography component="span" variant="body2" display="block">{u.email}</Typography>
                    <Typography component="span" variant="caption" color="text.secondary">
                      {u.conversation_count} conversations
                      {u.open_issue_count > 0 ? ` · ${u.open_issue_count} open issue${u.open_issue_count > 1 ? 's' : ''}` : ''}
                    </Typography>
                  </>
                }
              />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Box>
  );
}
