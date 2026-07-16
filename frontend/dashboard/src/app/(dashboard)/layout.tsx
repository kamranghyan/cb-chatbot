'use client';

/**
 * Shell for every authenticated screen: sidebar navigation + auth gate.
 * Route groups — (dashboard) — give shared layout without affecting URLs.
 */
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ChatIcon from '@mui/icons-material/ChatBubbleOutline';
import PeopleIcon from '@mui/icons-material/PeopleOutline';
import SecurityIcon from '@mui/icons-material/Security';
import FolderIcon from '@mui/icons-material/FolderOpen';
import BarChartIcon from '@mui/icons-material/BarChart';
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { useAuth } from '@/features/auth/hooks/useAuth';

const NAV = [
  { label: 'Chat', href: '/chat', icon: <ChatIcon /> },
  { label: 'Users', href: '/admin/users', icon: <PeopleIcon /> },
  { label: 'Roles', href: '/admin/roles', icon: <SecurityIcon /> },
  { label: 'Content', href: '/admin/content', icon: <FolderIcon /> },
  { label: 'Analytics', href: '/admin/analytics', icon: <BarChartIcon /> },
];

const DRAWER_WIDTH = 240;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <AuthGuard>
      <Box sx={{ display: 'flex' }}>
        <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight={700}>GenAI Dashboard</Typography>
            <Button color="inherit" onClick={logout}>Sign out</Button>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          sx={{ width: DRAWER_WIDTH, [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
        >
          <Toolbar />
          <List>
            {NAV.map((item) => (
              <ListItemButton
                key={item.href}
                selected={pathname.startsWith(item.href)}
                onClick={() => router.push(item.href)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          {children}
        </Box>
      </Box>
    </AuthGuard>
  );
}
