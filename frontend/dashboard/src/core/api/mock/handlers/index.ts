/**
 * Handler registry. To mock a NEW endpoint:
 *   1. Add its path to src/core/api/endpoints.ts
 *   2. Add a handler in the matching domain file here (or a new file)
 *   3. Export it below. Done — no UI changes.
 */
import type { RouteDef } from '../mockAdapter';
import { roleHandlers } from './roles';
import { userHandlers } from './users';
import { chatHandlers } from './chat';
import { contentHandlers } from './content';
import { urlHandlers } from './urls';
import { metadataHandlers } from './metadata';
import { analyticsHandlers } from './analytics';

export const handlers: RouteDef[] = [
  ...roleHandlers,
  ...userHandlers,
  ...chatHandlers,
  ...contentHandlers,
  ...urlHandlers,
  ...metadataHandlers,
  ...analyticsHandlers,
];
