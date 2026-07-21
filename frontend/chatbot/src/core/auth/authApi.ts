import type { SignupPayload, LoginPayload, RefreshPayload, TokenResponse } from './types'
import { extractAuthErrorMessage } from './apiError'

// ============================================================================
// Real auth API calls — plain fetch (this project has no axios dependency,
// keeping the widget library lean). Field names match the provided
// Pydantic schemas exactly.
//
// ⚠️ ENDPOINT PATHS ARE AN ASSUMPTION — only schemas.py was shared, not the
// router. Guessed from this backend's existing "XxxIn -> /auth/xxx"
// convention (dev-token's schema was DevTokenIn -> POST /auth/dev-token).
// If signup/login 404, this is the ONLY place to fix — share the actual
// router file and update the three paths below.
// ============================================================================

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000') + '/api/v1'

async function postJson<T>(path: string, body: unknown, errorFallback: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    throw new Error(await extractAuthErrorMessage(res, errorFallback))
  }
  return res.json()
}

export function signup(payload: SignupPayload): Promise<TokenResponse | { message?: string }> {
  return postJson('/auth/signup', payload, 'Could not create your account. Please try again.')
}

export function login(payload: LoginPayload): Promise<TokenResponse> {
  return postJson('/auth/login', { client_type: 'main', ...payload }, 'Incorrect email or password.')
}

export function refresh(payload: RefreshPayload): Promise<TokenResponse> {
  return postJson('/auth/refresh', { client_type: 'main', ...payload }, 'Session refresh failed.')
}
