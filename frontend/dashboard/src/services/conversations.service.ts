/**
 * MOCK-ONLY — no cross-user admin endpoint exists on this backend yet.
 * See ADMIN-ENDPOINTS-NEEDED.md at the project root for the exact spec.
 * Once added, change `mockOnlyClient` -> `apiClient` here and nowhere else.
 */
import { mockOnlyClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type {
  ApiResponse,
  ConversationUser,
  UserConversationThread,
  UnansweredQuestionRow,
  IssueRow,
} from '../core/api/types';

export const listConversationUsers = (): Promise<ApiResponse<ConversationUser[]>> =>
  mockOnlyClient.get(ENDPOINTS.adminConversations.users);

export const listUserThreads = (email: string): Promise<ApiResponse<UserConversationThread[]>> =>
  mockOnlyClient.get(ENDPOINTS.adminConversations.userThreads(email));

export const listUnansweredQuestions = (): Promise<ApiResponse<UnansweredQuestionRow[]>> =>
  mockOnlyClient.get(ENDPOINTS.adminConversations.unanswered);

export const listIssues = (): Promise<ApiResponse<IssueRow[]>> =>
  mockOnlyClient.get(ENDPOINTS.adminConversations.issues);
