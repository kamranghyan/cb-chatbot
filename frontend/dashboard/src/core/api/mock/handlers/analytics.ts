import type { RouteDef } from '../mockAdapter';
import { analyticsSummaryFixture, analyticsDailyFixture } from '../fixtures/analytics';

export const analyticsHandlers: RouteDef[] = [
  { route: 'GET /api/v1/analytics/summary', handler: () => ({ data: analyticsSummaryFixture }) },
  {
    route: 'GET /api/v1/analytics/daily',
    handler: ({ query }) => {
      const days = Number(query.get('days') ?? 14);
      return { data: analyticsDailyFixture.slice(-days) };
    },
  },
];
