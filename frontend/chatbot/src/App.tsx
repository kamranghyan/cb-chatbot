import React, { useState } from 'react'
import { ChatWidget } from './components/ChatWidget'
import type { ChatWidgetConfig } from './core/types'

// ============================================================================
// DEV PLAYGROUND — this file is only used by `npm run dev` to visually
// build/test the widget. It is NOT part of the published library (excluded
// via the lib build entry points in vite.lib.config.ts).
// ============================================================================

const baseConfig: ChatWidgetConfig = {
  botName: 'Demo Assistant',
  welcomeMessage: 'Hi! How can I help?',
  placeholderText: 'Ask me something…',
  position: 'bottom-right',
  showTypingIndicator: true,
  showTimestamps: true,
  fullScreenOnMobile: true,
  startOpen: true,
  protocol: { type: 'mock' } // <-- Step 2 swaps this for http/websocket/stream
}

export default function App() {
  const [scheme, setScheme] = useState<'light' | 'dark'>('light')

  const config: ChatWidgetConfig = {
    ...baseConfig,
    theme: { colorScheme: scheme }
  }

  return (
    <div style={pageStyle}>
      <div style={panelStyle}>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>React Chat Widget Kit — Playground</h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          Running in <code>mock</code> protocol mode with dummy data. Try typing{' '}
          <strong>hello</strong>, <strong>pricing</strong>, or <strong>help</strong> to see
          keyed replies, or anything else for a fallback streamed response.
        </p>
        <button onClick={() => setScheme((s) => (s === 'light' ? 'dark' : 'light'))} style={btnStyle}>
          Toggle theme (currently: {scheme})
        </button>
      </div>

      <ChatWidget config={config} />
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
