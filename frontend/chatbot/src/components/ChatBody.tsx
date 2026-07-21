import React, { useEffect, useRef } from 'react'
import type { ChatWidgetConfig, ConnectionStatus } from '../core/types'
import { useChat } from '../hooks/useChat'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { InputBar } from './InputBar'

interface ChatBodyProps {
  config: ChatWidgetConfig
  /** Bubbles the live connection status up to the shared Header in the parent. */
  onConnectionStatusChange: (status: ConnectionStatus) => void
}

/**
 * The actual chat experience (messages + input) — split out of ChatWidget
 * so it only mounts (and only calls useChat/opens a transport) once a user
 * is authenticated. AuthenticatedChatWidget swaps this in for <AuthPanel/>
 * within the SAME window, so there's no remount of the window itself, no
 * flicker, no reload — just this piece of the tree changing.
 */
export function ChatBody({ config, onConnectionStatusChange }: ChatBodyProps) {
  const { messages, connectionStatus, isBotTyping, sendMessage, stopGeneration } = useChat(config)
  const scrollRef = useRef<HTMLDivElement>(null)

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

      <InputBar placeholder={config.placeholderText} disabled={connectionStatus === 'error'} onSend={sendMessage} />

      {isBotTyping && (
        <button type="button" className="ccw-stop-btn" onClick={stopGeneration}>
          Stop generating
        </button>
      )}
    </>
  )
}
