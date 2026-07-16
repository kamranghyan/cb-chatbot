import type { Role } from '../../types';

/** Seed data. Handlers mutate copies of this at runtime so CRUD feels real. */
export const rolesFixture: Role[] = [
  { id: '1', name: 'editor', description: 'Editor role', permissions: ['create', 'read', 'delete'] },
  { id: '2', name: 'viewer', description: 'Viewer role', permissions: ['read'] },
  { id: '3', name: 'admin', description: 'Full administrator', permissions: ['full_access'] },
];
