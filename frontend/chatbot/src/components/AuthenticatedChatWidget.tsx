import React, { useMemo, useState } from 'react'
import type { ChatWidgetConfig, ConnectionStatus } from '../core/types'
import { useAuth } from '../core/auth/AuthContext'
import { ThemeProvider } from '../themes/ThemeProvider'
import { Header } from './Header'
import { LauncherButton } from './LauncherButton'
import { AuthPanel } from './AuthPanel'
import { ChatBody } from './ChatBody'
import widgetCss from './ChatWidget.css?inline'

let stylesInjected = false
function injectStylesOnce() {
  if (stylesInjected || typeof document === 'undefined') return
  stylesInjected = true
  const style = document.createElement('style')
  style.setAttribute('data-chat-widget-kit', 'true')
  style.textContent = widgetCss
  document.head.appendChild(style)
}
injectStylesOnce()

export interface AuthenticatedChatWidgetProps {
  config: ChatWidgetConfig
}

export function AuthenticatedChatWidget({ config }: AuthenticatedChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(Boolean(config.startOpen))
  const [chatConnectionStatus, setChatConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const { status, accessToken, logout } = useAuth()

  const position = config.position ?? 'bottom-right'

  const authedConfig: ChatWidgetConfig = useMemo(() => {
    if (status !== 'authenticated' || !accessToken || config.protocol.type === 'mock') {
      return config
    }
    if (config.protocol.type === 'websocket') {
      return { ...config, protocol: { ...config.protocol, authToken: accessToken } }
    }
    return {
      ...config,
      protocol: { ...config.protocol, headers: { ...config.protocol.headers, Authorization: `Bearer ${accessToken}` } }
    }
  }, [config, status, accessToken])

  const headerConnectionStatus: ConnectionStatus = status === 'authenticated' ? chatConnectionStatus : 'disconnected'

  return (
    <ThemeProvider colorScheme={config.theme?.colorScheme ?? 'light'} overrides={config.theme}>
      <div className={`ccw-container ccw-position-${position}`}>
        {isOpen && (
          <div className={`ccw-window ${config.fullScreenOnMobile ? 'ccw-fullscreen-mobile' : ''}`}>
            <Header
              botName={config.botName}
              botAvatarUrl={config.botAvatarUrl}
              connectionStatus={headerConnectionStatus}
              onClose={() => setIsOpen(false)}
              onLogout={status === 'authenticated' ? logout : undefined}
            />

            {status === 'checking' && <div className="ccw-auth-checking">Loading…</div>}
            {status === 'unauthenticated' && <AuthPanel initialView="signup" />}
            {status === 'authenticated' && (
              <ChatBody config={authedConfig} onConnectionStatusChange={setChatConnectionStatus} />
            )}
          </div>
        )}

        <LauncherButton isOpen={isOpen} onClick={() => setIsOpen((v) => !v)} />
      </div>
    </ThemeProvider>
  )
}