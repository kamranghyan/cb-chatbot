import React, { useEffect, useRef } from 'react'
import type { ChatWidgetConfig, ConnectionStatus } from '../core/types'
import { useChat } from '../hooks/useChat'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { InputBar } from './InputBar'

interface ChatBodyProps {
  config: ChatWidgetConfig
  onConnectionStatusChange: (status: ConnectionStatus) => void
}

// NEW — pulls the JWT out of whichever shape this transport's config uses,
// so InputBar/MicButton can reuse the exact same token the chat transport
// is already authenticating with. No new auth mechanism, just extraction.
function extractAccessToken(config: ChatWidgetConfig): string | undefined {
  const protocol = config.protocol as any
  if (protocol?.type === 'websocket') {
    return protocol.authToken
  }
  const authHeader: string | undefined = protocol?.headers?.Authorization
  return authHeader?.replace(/^Bearer\s+/i, '')
}

export function ChatBody({ config, onConnectionStatusChange }: ChatBodyProps) {
  const { messages, connectionStatus, isBotTyping, sendMessage, stopGeneration } = useChat(config)
  const scrollRef = useRef<HTMLDivElement>(null)
  const accessToken = extractAccessToken(config)   // NEW

  useEffect(() => {
    onConnectionStatusChange(connectionStatus)
  }, [connectionStatus, onConnectionStatusChange])

  useEffect(() => {
    const el = scrollRef.current
    if (el && typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isBotTyping])

  return (
    <>
      <div className="ccw-messages" ref={scrollRef}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} showTimestamp={config.showTimestamps} />
        ))}
        {isBotTyping && config.showTypingIndicator !== false && !messages.some((m) => m.isStreaming) && (
          <TypingIndicator />
        )}
      </div>

      <InputBar
        placeholder={config.placeholderText}
        disabled={connectionStatus === 'error'}
        onSend={sendMessage}
        accessToken={accessToken}
      />

      {isBotTyping && (
        <button type="button" className="ccw-stop-btn" onClick={stopGeneration}>
          Stop generating
        </button>
      )}
    </>
  )
}