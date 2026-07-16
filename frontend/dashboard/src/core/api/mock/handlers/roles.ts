/**
 * Mock handlers for the Roles domain.
 * Response envelopes intentionally mirror what the real backend will return
 * (paginated envelope for lists, bare object for single resources).
 */
import type { RouteDef } from '../mockAdapter';
import type { Role, Paginated } from '../../types';
import { rolesFixture } from '../fixtures/roles';

// Runtime copy — CRUD mutates this so the mock feels like a real backend
// within a browser session. Refreshing the page resets to fixtures.
let roles: Role[] = JSON.parse(JSON.stringify(rolesFixture));

const paginate = (items: Role[]): Paginated<Role> => ({
  count: items.length,
  next: null,
  previous: null,
  results: items,
});

export const roleHandlers: RouteDef[] = [
  {
    route: 'GET /roles',
    handler: () => ({ data: paginate(roles) }),
  },
  {
    route: 'GET /roles/:id',
    handler: ({ params }) => {
      const role = roles.find((r) => r.id === params.id);
      return role ? { data: role } : { status: 404, data: { message: 'Role not found' } };
    },
  },
  {
    route: 'POST /roles',
    handler: ({ body }) => {
      const payload = body as Partial<Role>;
      const created: Role = {
        id: String(Date.now()),
        name: payload.name ?? 'unnamed',
        description: payload.description ?? '',
        permissions: payload.permissions ?? [],
      };
      roles.push(created);
      return { status: 201, data: created };
    },
  },
  {
    route: 'PUT /roles/:id',
    handler: ({ params, body }) => {
      const idx = roles.findIndex((r) => r.id === params.id);
      if (idx === -1) return { status: 404, data: { message: 'Role not found' } };
      roles[idx] = { ...roles[idx], ...(body as Partial<Role>), id: params.id };
      return { data: roles[idx] };
    },
  },
  {
    route: 'DELETE /roles/:id',
    handler: ({ params }) => {
      roles = roles.filter((r) => r.id !== params.id);
      return { status: 204, data: null };
    },
  },
];
