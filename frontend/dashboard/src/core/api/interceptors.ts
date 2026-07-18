/**
 * Global request/response interceptors.
 * Backend auth: `Authorization: Bearer <jwt>` only (see core/auth in the
 * README — JWT + active-session check). No idToken header — that was an
 * Amplify/Cognito concept from the old project, not this backend.
 */
import type { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSavedUserSession } from './session';

type TimeoutDispatcher = (message: string) => void;
let sessionTimeoutDispatcher: TimeoutDispatcher | null = null;
export const registerSessionTimeoutDispatcher = (fn: TimeoutDispatcher): void => {
  sessionTimeoutDispatcher = fn;
};

export const requestInterceptor = (
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
  const session = getSavedUserSession();
  if (session?.accessToken) {
    config.headers.set('Authorization', `Bearer ${session.accessToken}`);
  }
  return config;
};

export const responseInterceptor = (response: AxiosResponse): AxiosResponse => response;

export const errorInterceptor = async (error: AxiosError): Promise<never> => {
  const status = error?.response?.status;
  if (status === 401 || status === 403) {
    sessionTimeoutDispatcher?.('Your session has expired. Please sign in again.');
    return Promise.reject(new Error('Session expired'));
  }
  if (status === 429) {
    return Promise.reject(new Error('Too many requests — please slow down (rate limit).'));
  }
  return Promise.reject(error);
};
