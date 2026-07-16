import { apiClient } from '../core/api/client';
import { ENDPOINTS } from '../core/api/endpoints';
import type { ApiResponse } from '../core/api/types';
import type { MessagePayload, GetDocumentPayload } from '../core/api/types';

export const addMessage = (payload: MessagePayload): Promise<ApiResponse<unknown>> =>
  apiClient.post(ENDPOINTS.chat.root, payload);

export const getChatsBySessionId = (sessionId: number): Promise<ApiResponse<unknown>> =>
  apiClient.get(ENDPOINTS.chat.bySession(sessionId));

export const getConversationBySessionAndChatId = (
  sessionId: number,
  chatId: string,
): Promise<ApiResponse<unknown>> => {
  const qs = new URLSearchParams({ session_id: String(sessionId), external_chat_id: chatId });
  return apiClient.get(`${ENDPOINTS.chat.sessionConversations}?${qs.toString()}`);
};

export const getThreadsList = (): Promise<ApiResponse<unknown[]>> =>
  apiClient.get(ENDPOINTS.chat.list);

export const getConversationById = (threadId: string): Promise<ApiResponse<unknown>> =>
  apiClient.get(ENDPOINTS.chat.byId(threadId));

export const deleteThreadById = (threadId: string): Promise<ApiResponse<void>> =>
  apiClient.delete(ENDPOINTS.chat.byId(threadId));

export const getDocumentDownloadLink = (payload: GetDocumentPayload): Promise<ApiResponse<unknown>> =>
  apiClient.post(ENDPOINTS.content.download, payload);

export const addFeedBack = async (payload: unknown, convId: number): Promise<unknown> => {
  try {
    const response = await apiClient.post(ENDPOINTS.chat.feedback(convId), payload);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 400) return error.response.data;
    throw error;
  }
};

export const getScore = (payload: unknown): Promise<ApiResponse<unknown>> =>
  apiClient.post(ENDPOINTS.chat.triadScores, payload);

export const getChatAccuracySetting = (): Promise<ApiResponse<string>> =>
  apiClient.get(ENDPOINTS.chat.accuracy);

export const getChatQuestionsList = (): Promise<ApiResponse<string[]>> =>
  apiClient.get(ENDPOINTS.chat.questions);

export const fetchChatTranslate = (convId: string): Promise<ApiResponse<unknown>> =>
  apiClient.get(ENDPOINTS.chat.translate(convId));
