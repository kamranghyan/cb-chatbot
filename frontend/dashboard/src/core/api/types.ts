/**
 * Shared API contract types.
 * These describe the SHAPE of what the backend returns, independent of
 * whether the data comes from the mock layer or the real network.
 */
import type { AxiosResponse } from 'axios';

/** A raw axios response whose body is T. Services unwrap this to T. */
export type ApiResponse<T> = AxiosResponse<T>;

/** Standard paginated envelope used by list endpoints (roles, users, ...). */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Normalised error every layer above the client can rely on. */
export interface ApiError {
  status?: number;
  message: string;
  details?: unknown;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
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

export interface ContentItem {
  external_uid: string;
  title: string;
  source_type: 'document' | 'website' | 'video';
  status?: string;
  url?: string;
  brand?: string;
  created_at?: string;
  presigned_url?: string;
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt?: string;
  messages?: unknown[];
}

export interface UrlItem {
  id: number;
  url: string;
  brandName?: string;
  status?: string;
}

export interface MessagePayload {
  message: string;
  thread_id?: string;
  model?: string;
  model_type?: string;
}

export interface GetDocumentPayload {
  document_id?: string;
  file_name?: string;
}
