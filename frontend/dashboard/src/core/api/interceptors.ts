/**
 * Global request/response interceptors.
 * They run in BOTH mock and real mode, so auth wiring is exercised even
 * before the backend exists.
 */
import type { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSavedUserSession } from './session';

type TimeoutDispatcher = (message: string) => void;
let sessionTimeoutDispatcher: TimeoutDispatcher | null = null;
/** Registered once by the app shell so 401/403 anywhere can trigger a re-login UX. */
export const registerSessionTimeoutDispatcher = (fn: TimeoutDispatcher): void => {
  sessionTimeoutDispatcher = fn;
};

export const requestInterceptor = (
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
  const session = getSavedUserSession();
  config.headers.set('Authorization', `Bearer ${session?.accessToken ?? ''}`);
  config.headers.set('idToken', session?.idToken ?? 'public');
  return config;
};

export const responseInterceptor = (response: AxiosResponse): AxiosResponse => response;

export const errorInterceptor = async (error: AxiosError): Promise<never> => {
  const status = error?.response?.status;
  if (status === 401 || status === 403 || status === 412) {
    sessionTimeoutDispatcher?.(
      status === 412 ? 'Your account setup is incomplete.' : 'Your session has expired. Please sign in again.',
    );
    return Promise.reject(new Error('Session expired'));
  }
  return Promise.reject(error);
};
