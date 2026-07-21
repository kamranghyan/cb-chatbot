// ============================================================================
// Auth contract — copied exactly from the provided Pydantic schemas
// (SignupIn/LoginIn/RefreshIn/TokenOut). Endpoint PATHS are an assumption
// pending the actual router file — see AUTH-INTEGRATION-NOTES.md.
// ============================================================================

export interface SignupPayload {
  email: string
  password: string // backend requires 8-128 chars
}

export type ClientType = 'main' | 'guest'

export interface LoginPayload {
  email: string
  password: string
  client_type?: ClientType
}

export interface RefreshPayload {
  refresh_token: string
  client_type?: ClientType
}

export interface TokenResponse {
  access_token: string
  refresh_token?: string | null
  expires_in: number
  token_type: string
}

export interface UserSession {
  accessToken: string
  refreshToken?: string | null
  /** epoch ms — when accessToken should be considered expired */
  expiresAt?: number
  email?: string
}
