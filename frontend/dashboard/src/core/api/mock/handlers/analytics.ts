import type { RouteDef } from '../mockAdapter';
import { analyticsSummaryFixture } from '../fixtures/analytics';

export const analyticsHandlers: RouteDef[] = [
  { route: 'GET /analytics/summary', handler: () => ({ data: analyticsSummaryFixture }) },
];
