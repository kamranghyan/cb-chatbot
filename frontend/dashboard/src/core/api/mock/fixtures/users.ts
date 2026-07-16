import type { AdminUser } from '../../types';

export const usersFixture: AdminUser[] = [
  { id: 'u-001', email: 'sarah.khan@example.com', first_name: 'Sarah', last_name: 'Khan', role: 'admin', status: 'active', created_at: '2026-01-12T09:30:00Z' },
  { id: 'u-002', email: 'omar.aziz@example.com', first_name: 'Omar', last_name: 'Aziz', role: 'customer', status: 'active', created_at: '2026-02-03T14:10:00Z' },
  { id: 'u-003', email: 'lina.haddad@example.com', first_name: 'Lina', last_name: 'Haddad', role: 'customer', status: 'invited', created_at: '2026-03-21T11:45:00Z' },
];

export const botsFixture: AdminUser[] = [
  { id: 'b-001', email: 'carolina-bot@example.com', first_name: 'Carolina', last_name: 'Bot', role: 'bot', status: 'active' },
  { id: 'b-002', email: 'mahatma-bot@example.com', first_name: 'Mahatma', last_name: 'Bot', role: 'bot', status: 'active' },
];

export const userRolesFixture = ['admin', 'customer'];
