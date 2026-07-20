import { apiClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type {
  ApiResponse,
  ChatResponse,
  ChatListItem,
  ChatDetail,
  FeedbackPayload,
  IssuePayload,
} from '../core/api/types';

/** Exact match: src/api/v1/schemas/chat.py -> ChatRequest */
export interface SendMessagePayload {
  question: string;
  /** omit/null = new chat; backend creates one and returns external_chat_id */
  external_chat_id?: string | null;
  is_regenerate?: boolean;
}

export const sendMessage = (payload: SendMessagePayload): Promise<ApiResponse<ChatResponse>> =>
  apiClient.post(ENDPOINTS.chat.root, payload);

export const getChatList = (): Promise<ApiResponse<ChatListItem[]>> =>
  apiClient.get(ENDPOINTS.chat.list);

export const getChatById = (chatId: string): Promise<ApiResponse<ChatDetail>> =>
  apiClient.get(ENDPOINTS.chat.byId(chatId));

export const sendFeedback = (convId: string, payload: FeedbackPayload): Promise<ApiResponse<unknown>> =>
  apiClient.post(ENDPOINTS.chat.feedback(convId), payload);

export const fileIssue = (chatId: string, payload: IssuePayload): Promise<ApiResponse<unknown>> =>
  apiClient.post(ENDPOINTS.chat.issue(chatId), payload);
