import React, { useMemo, useState } from 'react'
import { ChatWidget } from './components/ChatWidget'
import type { ChatWidgetConfig, ProtocolConfig } from './core/types'
// App.tsx
import netflixLogo from '../public/assets/logos-img/netflix-logo.jpg'

// ============================================================================
// DEV PLAYGROUND — this file is only used by `npm run dev` to visually
// build/test the widget against the REAL RAG Chatbot Backend v2. It is NOT
// part of the published library (excluded via the lib build entry points
// in vite.lib.config.ts).
//
// Setup: copy .env.example -> .env.local, fill in VITE_API_BASE_URL and
// VITE_AUTH_TOKEN (get a token via POST /api/v1/auth/dev-token locally, or
// paste a real one from your app's login flow), then `npm run dev`.
// ============================================================================

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000') + '/api/v1'
const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN ?? ''

type TransportChoice = 'http' | 'stream' | 'websocket' | 'mock'

function buildProtocolConfig(choice: TransportChoice): ProtocolConfig {
  const headers = { Authorization: `Bearer ${AUTH_TOKEN}` }
  switch (choice) {
    case 'http':
      return { type: 'http', endpoint: `${API_BASE}/chat`, headers }
    case 'stream':
      return { type: 'stream', endpoint: `${API_BASE}/chat/stream`, headers }
    case 'websocket': {
      const wsBase = API_BASE.replace(/^http/, 'ws')
      return { type: 'websocket', url: `${wsBase}/chat/ws`, authToken: AUTH_TOKEN }
    }
    case 'mock':
    default:
      return { type: 'mock' }
  }
}

export default function App() {
  const [scheme, setScheme] = useState<'light' | 'dark'>('light')
  const [transportChoice, setTransportChoice] = useState<TransportChoice>(
    AUTH_TOKEN ? 'http' : 'mock'
  )

  const config: ChatWidgetConfig = useMemo(() => {
    const protocol = buildProtocolConfig(transportChoice)
    return {
      botName: 'Netflix Assistant',
      botAvatarUrl: netflixLogo,
      welcomeMessage: 'Hi! How can I help?',
      placeholderText: 'Ask me something…',
      position: 'bottom-right',
      showTypingIndicator: true,
      showTimestamps: true,
      fullScreenOnMobile: true,
      startOpen: true,
      theme: { colorScheme: scheme },
      protocol
    }
  }, [transportChoice, scheme])

  return (
    <div style={pageStyle}>
      <div style={panelStyle}>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>React Chat Widget Kit — Playground</h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          Connected to the RAG Chatbot Backend v2 at <code>{API_BASE}</code>.
          {!AUTH_TOKEN && (
            <>
              {' '}
              <strong>No VITE_AUTH_TOKEN set</strong> — falling back to{' '}
              <code>mock</code> mode. See <code>.env.example</code>.
            </>
          )}
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {(['http', 'stream', 'websocket', 'mock'] as TransportChoice[]).map((t) => (
            <button
              key={t}
              onClick={() => setTransportChoice(t)}
              style={{ ...btnStyle, ...(transportChoice === t ? activeBtnStyle : {}) }}
            >
              {t}
            </button>
          ))}
        </div>

        <button onClick={() => setScheme((s) => (s === 'light' ? 'dark' : 'light'))} style={btnStyle}>
          Toggle theme (currently: {scheme})
        </button>
      </div>

      {/* key={transportChoice} forces a full remount so switching protocol
          mid-session doesn't try to reuse a stale transport instance */}
      <ChatWidget key={transportChoice} config={config} />
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#F0F1F5',
  fontFamily: 'Inter, system-ui, sans-serif'
}

const panelStyle: React.CSSProperties = {
  maxWidth: 640,
  margin: '0 auto',
  padding: '48px 24px'
}

const btnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #ddd',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13
}

const activeBtnStyle: React.CSSProperties = {
  background: '#111',
  color: '#fff',
  borderColor: '#111'
}
