import type { RouteDef } from '../mockAdapter';

export const authHandlers: RouteDef[] = [
  { route: 'POST /api/v1/auth/dev-token', handler: () => ({ data: { access_token: 'mock-dev-token', token_type: 'bearer' } }) },
];
