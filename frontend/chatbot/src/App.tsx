import React, { useMemo } from 'react'
import { AuthProvider } from './core/auth/AuthContext'
import { AuthenticatedChatWidget } from './components/AuthenticatedChatWidget'
import type { ChatWidgetConfig } from './core/types'
import netflixLogo from '../public/assets/logos-img/netflix-logo.jpg'

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
        type: 'websocket',
        url: 'ws://localhost:8000/api/v1/chat/ws'
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