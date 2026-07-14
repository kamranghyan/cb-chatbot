import React, { useEffect, useRef, useState } from 'react'
import type { ChatWidgetConfig } from '../core/types'
import { useChat } from '../hooks/useChat'
import { ThemeProvider } from '../themes/ThemeProvider'
import { Header } from './Header'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { InputBar } from './InputBar'
import { LauncherButton } from './LauncherButton'
import widgetCss from './ChatWidget.css?inline'

// ----------------------------------------------------------------------------
// Styles are injected into <head> as a plain <style> tag at module-load time
// rather than imported as a normal stylesheet. This is what makes a single
// bundled JS file (dist/embed-standalone.js) fully self-contained — a
// consumer only needs one <script> tag, with no separate CSS file to link.
// Guarded so multiple ChatWidget instances / re-imports never double-inject.
// ----------------------------------------------------------------------------
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

export interface ChatWidgetProps {
  config: ChatWidgetConfig
}

/**
 * The single public entry point for consumers.
 *
 *   <ChatWidget config={{ botName: 'Assistant', protocol: { type: 'mock' } }} />
 *
 * Everything about behavior (protocol, theme, layout, feature toggles) is
 * driven by `config` — no other props exist by design, so the same
 * component works identically whether imported into a React app or mounted
 * via the standalone/web-component embed wrapper.
 */
export function ChatWidget({ config }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(Boolean(config.startOpen))
  const { messages, connectionStatus, isBotTyping, sendMessage, stopGeneration } =
    useChat(config)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el && typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isBotTyping])

  const position = config.position ?? 'bottom-right'

  return (
    <ThemeProvider colorScheme={config.theme?.colorScheme ?? 'light'} overrides={config.theme}>
      <div className={`ccw-container ccw-position-${position}`}>
        {isOpen && (
          <div className={`ccw-window ${config.fullScreenOnMobile ? 'ccw-fullscreen-mobile' : ''}`}>
            <Header
              botName={config.botName}
              botAvatarUrl={config.botAvatarUrl}
              connectionStatus={connectionStatus}
              onClose={() => setIsOpen(false)}
            />

            <div className="ccw-messages" ref={scrollRef}>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  showTimestamp={config.showTimestamps}
                />
              ))}
              {isBotTyping &&
                config.showTypingIndicator !== false &&
                !messages.some((m) => m.isStreaming) && <TypingIndicator />}
            </div>

            <InputBar
              placeholder={config.placeholderText}
              disabled={connectionStatus === 'error'}
              onSend={sendMessage}
            />

            {isBotTyping && (
              <button type="button" className="ccw-stop-btn" onClick={stopGeneration}>
                Stop generating
              </button>
            )}
          </div>
        )}

        <LauncherButton isOpen={isOpen} onClick={() => setIsOpen((v) => !v)} />
      </div>
    </ThemeProvider>
  )
}
