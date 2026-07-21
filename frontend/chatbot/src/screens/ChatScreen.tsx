import React, { useMemo } from 'react'
import { ChatWidget } from '../components/ChatWidget'
import { useAuth } from '../core/auth/AuthContext'
import type { ChatWidgetConfig } from '../core/types'
import netflixLogo from '../../public/assets/logos-img/netflix-logo.jpg'
import './ChatScreen.css'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000') + '/api/v1'

/**
 * The screen a user lands on after logging in. Reuses the existing
 * ChatWidget component untouched — only the config (protocol + auth header)
 * changes, driven by the real access token from useAuth().
 */
export function ChatScreen() {
  const { email, accessToken, logout } = useAuth()

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
        endpoint: `${API_BASE}/chat`,
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    }),
    [accessToken]
  )

  return (
    <div className="chat-screen">
      <header className="chat-screen-topbar">
        <span className="chat-screen-brand">RAG Assistant</span>
        <div className="chat-screen-user">
          <span className="chat-screen-email">{email}</span>
          <button type="button" className="chat-screen-signout" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="chat-screen-body">
        <p className="chat-screen-hint">
          You&apos;re signed in. The chat assistant is in the bottom-right corner — click it to start.
        </p>
      </main>

      <ChatWidget config={config} />
    </div>
  )
}
