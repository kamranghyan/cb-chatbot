import React, { useMemo } from 'react'
import { AuthProvider } from './core/auth/AuthContext'
import { AuthenticatedChatWidget } from './components/AuthenticatedChatWidget'
import type { ChatWidgetConfig } from './core/types'
import netflixLogo from '../public/assets/logos-img/netflix-logo.jpg'

// ============================================================================
// APP SHELL — no routes, no separate auth pages. Signup/Login/Chat all live
// inside the one <AuthenticatedChatWidget/>, same window, same launcher
// button, same position — exactly like any chat widget a visitor would
// expect, just auth-aware. AuthProvider gives every part of that widget
// (AuthPanel, ChatBody, etc.) one shared, already-resolved auth state.
// ============================================================================

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000') + '/api/v1'

export default function App() {
  const config: ChatWidgetConfig = useMemo(
    () => ({
      botName: 'Assistant',
      botAvatarUrl: netflixLogo,
      welcomeMessage: 'Hi! How can I help?',
      placeholderText: 'Ask me something…',
      position: 'bottom-right',
      showTypingIndicator: true,
      showTimestamps: true,
      fullScreenOnMobile: true,
      startOpen: true,
      protocol: {
        type: 'http',
        endpoint: `${API_BASE}/chat`
        // Authorization header is injected automatically by
        // AuthenticatedChatWidget once the user is logged in — nothing to
        // configure here.
      }
    }),
    []
  )

  return (
    <AuthProvider>
      <AuthenticatedChatWidget config={config} />
    </AuthProvider>
  )
}
