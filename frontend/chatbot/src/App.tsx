import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './core/auth/AuthContext'
import { RegisterScreen } from './screens/RegisterScreen'
import { LoginScreen } from './screens/LoginScreen'
import { ChatScreen } from './screens/ChatScreen'
import './screens/AuthScreens.css'

// ============================================================================
// APP SHELL — real URL routing (react-router-dom), so login always lands on
// /chat with the address bar actually reflecting it — not just an internal
// state switch. Register -> Login -> Chat, backed entirely by the real auth
// API (no mock, no hardcoded credentials).
// ============================================================================

/** Blocks /chat until a session exists; sends guests to /register instead. */
function RequireAuth({ children }: { children: React.ReactElement }) {
  const { status } = useAuth()

  if (status === 'checking') {
    // Synchronous localStorage read under the hood — this resolves on the
    // very first render pass, not a network wait. Shown only to avoid a
    // one-frame flash between "unknown" and "authenticated".
    return <div className="auth-checking">Loading…</div>
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/register" replace />
  }
  return children
}

/** Sends an already-logged-in visitor straight to /chat instead of Register/Login. */
function RedirectIfAuthed({ children }: { children: React.ReactElement }) {
  const { status } = useAuth()

  if (status === 'checking') {
    return <div className="auth-checking">Loading…</div>
  }
  if (status === 'authenticated') {
    return <Navigate to="/chat" replace />
  }
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/register"
            element={
              <RedirectIfAuthed>
                <RegisterScreen />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <LoginScreen />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/chat"
            element={
              <RequireAuth>
                <ChatScreen />
              </RequireAuth>
            }
          />
          {/* Root and any unknown path: authenticated -> /chat, guest -> /register */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function RootRedirect() {
  const { status } = useAuth()
  if (status === 'checking') return <div className="auth-checking">Loading…</div>
  return <Navigate to={status === 'authenticated' ? '/chat' : '/register'} replace />
}
