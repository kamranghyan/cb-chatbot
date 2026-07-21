import React, { createContext, useContext, useCallback, useEffect, useState } from 'react'
import * as authApi from './authApi'
import { saveSession, getSession, clearSession, isSessionValid } from './session'
import type { TokenResponse } from './types'

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  email: string | null
  accessToken: string | null
  register: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Single shared auth state for the whole app, mounted ONCE at the root
 * (see App.tsx). Previously each screen called a standalone useAuth() hook
 * with its own local state — every navigation (e.g. Login -> /chat) mounted
 * a brand-new instance that re-ran its "checking localStorage" boot phase
 * from scratch, causing a visible flash/delay right after login. A shared
 * context fixes that: the session is read once, and every screen re-renders
 * from the same already-resolved state instantly.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [email, setEmail] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    const session = getSession()
    if (isSessionValid(session)) {
      setStatus('authenticated')
      setEmail(session!.email ?? null)
      setAccessToken(session!.accessToken)
    } else {
      setStatus('unauthenticated')
    }
  }, [])

  const persist = useCallback((data: TokenResponse, userEmail: string) => {
    saveSession({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: Date.now() + data.expires_in * 1000,
      email: userEmail
    })
    setEmail(userEmail)
    setAccessToken(data.access_token)
    setStatus('authenticated')
  }, [])

  // Proactively refresh the access token ~60s before it expires, so a
  // long-lived chat session never suddenly 401s mid-conversation.
  useEffect(() => {
    if (status !== 'authenticated') return
    const session = getSession()
    if (!session?.expiresAt || !session.refreshToken) return

    const msUntilRefresh = Math.max(session.expiresAt - Date.now() - 60_000, 5_000)
    const timer = setTimeout(async () => {
      try {
        const data = await authApi.refresh({ refresh_token: session.refreshToken! })
        persist(data, session.email ?? '')
      } catch {
        clearSession()
        setStatus('unauthenticated')
        setEmail(null)
        setAccessToken(null)
      }
    }, msUntilRefresh)

    return () => clearTimeout(timer)
  }, [status, accessToken, persist])

  const register = useCallback(async (userEmail: string, password: string) => {
    await authApi.signup({ email: userEmail, password })
    // Per the required flow: successful registration does NOT auto-login —
    // the user proves their credentials once more on the Login screen.
  }, [])

  const login = useCallback(
    async (userEmail: string, password: string) => {
      const data = await authApi.login({ email: userEmail, password })
      persist(data, userEmail)
    },
    [persist]
  )

  const logout = useCallback(() => {
    clearSession()
    setStatus('unauthenticated')
    setEmail(null)
    setAccessToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ status, email, accessToken, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth() must be used within <AuthProvider>')
  return ctx
}
