import type { RouteDef } from '../mockAdapter';
import { departmentsFixture } from '../fixtures/metadata';

export const metadataHandlers: RouteDef[] = [
  { route: 'GET /departments/list', handler: () => ({ data: departmentsFixture }) },
];
