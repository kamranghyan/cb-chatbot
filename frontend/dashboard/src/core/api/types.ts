/**
 * Shared API contract types — REAL backend (RAG Chatbot Backend v2).
 *
 * Chat + Ingestion types below are copied 1:1 from the actual Pydantic
 * schemas (src/api/v1/schemas/chat.py, ingestion.py) — confirmed exact,
 * not guessed. Analytics has NO schemas.py on the backend (dict responses,
 * unconfirmed shape) — still best-guess; share src/api/v1/analytics.py
 * or analytics_service.py to lock that down too.
 */
import type { AxiosResponse } from 'axios';

export type ApiResponse<T> = AxiosResponse<T>;

export interface ApiError {
  status?: number;
  message: string;
  details?: unknown;
}

// ---- Auth ----
export interface DevTokenResponse {
  access_token: string;
  token_type?: string;
}

// ---- Chat (exact match: src/api/v1/schemas/chat.py) ----
export interface ChatSource {
  content: string;
  metadata?: Record<string, unknown> | null;
  score?: number | null;
}

export interface ChatResponse {
  external_chat_id: string;
  external_conv_id: string;
  title: string;
  answer: string | null;
  response_time: number | null;
  sources: ChatSource[];
}

export interface ConversationSource {
  distance: number;
  doc_metadata?: Record<string, unknown> | null;
}

export interface ConversationItem {
  external_conv_id: string;
  question?: string | null;
  answer?: string | null;
  reaction?: Record<string, unknown> | null;
  is_regenerate: boolean;
  response_time?: number | null;
  created_at: string;
  sources: ConversationSource[];
}

/** src.domain.enums.CategoryEnum / SubCategoryEnum — exact member values unconfirmed. */
export type CategoryEnum = 'ISSUES' | 'GENERAL' | string;
export type SubCategoryEnum = string;

export interface ChatListItem {
  external_chat_id: string;
  title: string;
  model: string;
  brand_id: string;
  category: CategoryEnum;
  sub_category?: SubCategoryEnum | null;
  created_at: string;
}

export interface ChatDetail extends ChatListItem {
  conversations: ConversationItem[];
}

export interface FeedbackPayload {
  liked?: boolean;
  disliked?: boolean;
  comment?: string;
}

export interface IssuePayload {
  category?: CategoryEnum;
  sub_category?: SubCategoryEnum;
  description?: string;
}

// ---- Ingestion (exact match: src/api/v1/schemas/ingestion.py) ----
export type SecurityLevel = 'PUBLIC' | 'PRIVATE' | 'SECRET';
export type IngestionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IngestTextPayload {
  text: string;
  name?: string; // backend default: "inline-text"
  security_level?: SecurityLevel; // backend default: PUBLIC
  department_id?: string;
}

export interface IngestS3Payload {
  s3_key: string;
  security_level?: SecurityLevel;
  department_id?: string;
}

export interface PresignedUrlPayload {
  filename: string;
}

export interface PresignedUrlResponse {
  upload_url: string;
  s3_key: string;
  expires_in: number;
}

export interface IngestionItem {
  external_uid: string;
  source_type: string | null;
  source_path: string | null;
  status: IngestionStatus;
  chunk_count: number | null;
  error: string | null;
  security_level: SecurityLevel;
  created_at: string;
}

// ---- Analytics (exact match: src/services/analytics_service.py) ----
export interface AnalyticsSummary {
  total_chats: number;
  total_conversations: number;
  /** seconds, not ms */
  avg_response_time: number | null;
  feedback: { likes: number; dislikes: number };
  /** keys = IngestionStatus values, e.g. { PENDING: 2, COMPLETED: 38 } */
  ingestions_by_status: Record<string, number>;
  cached: boolean;
}

export interface AnalyticsDailyPoint {
  day: string;
  conversations: number;
  /** seconds, not ms */
  avg_response_time: number | null;
}

// ---- Conversation Management (admin view over Chat/Conversation — see
// ADMIN-ENDPOINTS-NEEDED.md: backend has NO cross-user admin endpoint yet,
// so these are demo-data-only for now via mockOnlyClient, same pattern as
// Users/Roles) ----
export interface ConversationUser {
  email: string;
  first_name: string;
  last_name: string;
  conversation_count: number;
  unanswered_count: number;
  open_issue_count: number;
  last_activity: string;
}

export interface QAExchange {
  external_conv_id: string;
  question: string;
  answer: string | null; // null/empty = unanswered
  sources: ChatSource[];
  reaction?: { liked?: boolean; disliked?: boolean; comment?: string } | null;
  created_at: string;
}

export interface ConversationIssue {
  category: string;
  sub_category?: string | null;
  description?: string | null;
  /** NOT a real backend field yet — see ADMIN-ENDPOINTS-NEEDED.md */
  resolution?: string | null;
  resolved: boolean;
}

export interface UserConversationThread {
  external_chat_id: string;
  title: string;
  email: string;
  created_at: string;
  exchanges: QAExchange[];
  issue: ConversationIssue | null;
}


export interface UnansweredQuestionRow {
  external_conv_id: string;
  external_chat_id: string;
  email: string;
  user_name: string;
  question: string;
  created_at: string;
}

export interface IssueRow extends ConversationIssue {
  external_chat_id: string;
  email: string;
  user_name: string;
  title: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
  status?: string;
  created_at?: string;
}
export interface Department {
  id: string;
  name: string;
}
