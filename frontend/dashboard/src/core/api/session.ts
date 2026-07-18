/**
 * Client-side session storage. The backend's local dev auth is a single
 * bearer token from POST /auth/dev-token — no idToken/refreshToken pair
 * (that's an Amplify/Cognito concept from the old CRA project, not this
 * backend). Kept minimal on purpose.
 */
export interface UserSession {
  accessToken: string;
  email?: string;
}

const KEY = 'RAG_DASHBOARD_SESSION';

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
