import React, { useState, type FormEvent } from 'react'
import { useAuth } from '../core/auth/AuthContext'
import authPanelCss from './AuthPanel.css?inline'

// Separate injection from ChatWidget.css so the plain, publicly-exported
// <ChatWidget/> (for hosts that manage their own auth) never ships this
// CSS at all — only AuthenticatedChatWidget's tree pays for it.
let authStylesInjected = false
function injectAuthStylesOnce() {
  if (authStylesInjected || typeof document === 'undefined') return
  authStylesInjected = true
  const style = document.createElement('style')
  style.setAttribute('data-chat-widget-kit-auth', 'true')
  style.textContent = authPanelCss
  document.head.appendChild(style)
}
injectAuthStylesOnce()

interface AuthPanelProps {
  /** Which form to show first. Defaults to 'signup' — a brand-new visitor
   *  opening the chatbot sees Signup before Login. */
  initialView?: 'signup' | 'login'
}

/**
 * Renders INSIDE the widget's own window (same Header/LauncherButton chrome
 * as the chat view) — there is no separate page or route. Swapping between
 * this panel and the chat view is a pure state change in
 * AuthenticatedChatWidget, not a remount, so the window never flickers or
 * reloads.
 */
export function AuthPanel({ initialView = 'signup' }: AuthPanelProps) {
  const [view, setView] = useState<'signup' | 'login'>(initialView)

  return view === 'signup' ? (
    <SignupView onSwitchToLogin={() => setView('login')} onRegistered={() => setView('login')} />
  ) : (
    <LoginView onSwitchToSignup={() => setView('signup')} />
  )
}

function SignupView({
  onSwitchToLogin,
  onRegistered
}: {
  onSwitchToLogin: () => void
  onRegistered: () => void
}) {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await register(email, password)
      // Per the required flow: after successful signup, show Login —
      // still inside this same window, no navigation of any kind.
      onRegistered()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ccw-auth-panel">
      <h3 className="ccw-auth-title">Create an account</h3>
      <p className="ccw-auth-subtitle">Sign up to start chatting.</p>
      {error && <div className="ccw-auth-error" role="alert">{error}</div>}
      <form className="ccw-auth-form" onSubmit={handleSubmit}>
        <div className="ccw-auth-field">
          <label htmlFor="ccw-reg-email">Email</label>
          <input id="ccw-reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="ccw-auth-field">
          <label htmlFor="ccw-reg-password">Password</label>
          <input id="ccw-reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          <span className="ccw-auth-hint">At least 8 characters</span>
        </div>
        <div className="ccw-auth-field">
          <label htmlFor="ccw-reg-confirm">Confirm password</label>
          <input id="ccw-reg-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
        </div>
        <button type="submit" className="ccw-auth-submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <div className="ccw-auth-switch">
        Already have an account? <button type="button" onClick={onSwitchToLogin}>Sign in</button>
      </div>
    </div>
  )
}

function LoginView({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      // No navigation call needed here at all: AuthenticatedChatWidget
      // reacts to the shared AuthContext's `status` flipping to
      // 'authenticated' and swaps this panel for the chat view in the
      // SAME window on its very next render — same component tree,
      // same open/close state, zero reload.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ccw-auth-panel">
      <h3 className="ccw-auth-title">Sign in</h3>
      <p className="ccw-auth-subtitle">Welcome back — sign in to continue.</p>
      {error && <div className="ccw-auth-error" role="alert">{error}</div>}
      <form className="ccw-auth-form" onSubmit={handleSubmit}>
        <div className="ccw-auth-field">
          <label htmlFor="ccw-login-email">Email</label>
          <input id="ccw-login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="ccw-auth-field">
          <label htmlFor="ccw-login-password">Password</label>
          <input id="ccw-login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <button type="submit" className="ccw-auth-submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="ccw-auth-switch">
        Don&apos;t have an account? <button type="button" onClick={onSwitchToSignup}>Create one</button>
      </div>
    </div>
  )
}
