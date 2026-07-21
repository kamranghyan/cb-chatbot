import type { UserSession } from './types'

// ============================================================================
// Client-side session storage (localStorage). Kept separate from any one
// transport so both the auth screens and the chat transports (which need
// the access token for the Authorization header) can read it.
// ============================================================================

const KEY = 'ccw_auth_session'

export function saveSession(session: UserSession): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function getSession(): UserSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserSession
  } catch {
    return null
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}

export function isSessionValid(session: UserSession | null): boolean {
  if (!session?.accessToken) return false
  if (!session.expiresAt) return true
  return Date.now() < session.expiresAt
}
