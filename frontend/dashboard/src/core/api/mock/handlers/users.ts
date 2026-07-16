import type { RouteDef } from '../mockAdapter';
import type { AdminUser } from '../../types';
import { usersFixture, botsFixture, userRolesFixture } from '../fixtures/users';

let users: AdminUser[] = JSON.parse(JSON.stringify(usersFixture));

export const userHandlers: RouteDef[] = [
  { route: 'GET /users/list', handler: () => ({ data: users }) },
  { route: 'GET /users/bots', handler: () => ({ data: botsFixture }) },
  { route: 'GET /users/role/list', handler: () => ({ data: userRolesFixture }) },
  {
    route: 'GET /users',
    handler: ({ query }) => {
      const email = query.get('email')?.toLowerCase();
      const found = users.find((u) => u.email.toLowerCase() === email);
      return found ? { data: found } : { status: 404, data: { message: 'User not found', code: 'USER__NOT_FOUND' } };
    },
  },
  {
    route: 'GET /user/get-user-by-id',
    handler: ({ query }) => {
      const found = users.find((u) => u.id === query.get('id'));
      return found ? { data: found } : { status: 404, data: { message: 'User not found' } };
    },
  },
  {
    route: 'POST /users',
    handler: ({ body }) => {
      const payload = body as Partial<AdminUser>;
      const created: AdminUser = {
        id: `u-${Date.now()}`,
        email: payload.email ?? '',
        first_name: payload.first_name ?? '',
        last_name: payload.last_name ?? '',
        role: payload.role ?? 'customer',
        status: 'invited',
        created_at: new Date().toISOString(),
      };
      users.push(created);
      return { status: 201, data: created };
    },
  },
  {
    route: 'PATCH /users/:id',
    handler: ({ params, body }) => {
      const idx = users.findIndex((u) => u.id === params.id);
      if (idx === -1) return { status: 404, data: { message: 'User not found' } };
      users[idx] = { ...users[idx], ...(body as Partial<AdminUser>), id: params.id };
      return { data: users[idx] };
    },
  },
  {
    route: 'DELETE /users/:id',
    handler: ({ params }) => {
      users = users.filter((u) => u.id !== params.id);
      return { status: 204, data: null };
    },
  },
  {
    route: 'GET /users/session_list',
    handler: ({ query }) => ({
      data: {
        count: 2,
        page: Number(query.get('page') ?? 1),
        results: [
          { session_id: 501, started_at: '2026-07-01T10:00:00Z', message_count: 6 },
          { session_id: 502, started_at: '2026-07-05T15:30:00Z', message_count: 2 },
        ],
      },
    }),
  },
  { route: 'POST /users/login', handler: () => ({ data: { accessToken: 'mock-access-token', idToken: 'mock-id-token', refreshToken: 'mock-refresh-token' } }) },
  { route: 'POST /users/refresh-token', handler: () => ({ data: { accessToken: 'mock-access-token-refreshed' } }) },
];
