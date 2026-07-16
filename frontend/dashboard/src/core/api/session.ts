/**
 * Client-side session storage (tokens). Kept next to the api layer because
 * the request interceptor is its main consumer. Swap the implementation
 * (cookies, next-auth, Amplify) without touching anything above it.
 */
export interface UserSession {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
}

const KEY = 'GENAI_DASHBOARD_SESSION';

export const saveUserSession = (session: UserSession): void => {
  if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(session));
};

export const getSavedUserSession = (): UserSession | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as UserSession) : null;
};

export const clearUserSession = (): void => {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY);
};
