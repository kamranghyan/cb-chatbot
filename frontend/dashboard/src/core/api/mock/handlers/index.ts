/**
 * Handler registry. To mock a NEW endpoint:
 *   1. Add its path to src/core/api/endpoints.ts
 *   2. Add a handler in the matching domain file here (or a new file)
 *   3. Export it below. Done — no UI changes.
 *
 * roles/users/metadata stay mock-only permanently (see services/*.service.ts)
 * because this backend has no real endpoints for them.
 */
import type { RouteDef } from '../mockAdapter';
import { roleHandlers } from './roles';
import { userHandlers } from './users';
import { chatHandlers } from './chat';
import { ingestionHandlers } from './ingestion';
import { metadataHandlers } from './metadata';
import { analyticsHandlers } from './analytics';
import { authHandlers } from './auth';
import { conversationHandlers } from './conversations';

export const handlers: RouteDef[] = [
  ...roleHandlers,
  ...userHandlers,
  ...chatHandlers,
  ...ingestionHandlers,
  ...metadataHandlers,
  ...analyticsHandlers,
  ...authHandlers,
  ...conversationHandlers,
];
