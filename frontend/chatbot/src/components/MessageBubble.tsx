import React from 'react'
import type { ChatMessage } from '../core/types'

interface MessageBubbleProps {
  message: ChatMessage
  showTimestamp?: boolean
}

export function MessageBubble({ message, showTimestamp }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`ccw-row ${isUser ? 'ccw-row-user' : 'ccw-row-assistant'}`}>
      <div
        className={`ccw-bubble ${isUser ? 'ccw-bubble-user' : 'ccw-bubble-assistant'} ${
          message.status === 'error' ? 'ccw-bubble-error' : ''
        }`}
      >
        <span>{message.content}</span>
        {message.isStreaming && <span className="ccw-caret" aria-hidden="true" />}
        {message.status === 'error' && (
          <div className="ccw-error-text">{message.error ?? 'Something went wrong'}</div>
        )}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="ccw-sources">
            <span className="ccw-sources-label">Sources</span>
            <ul className="ccw-sources-list">
              {message.sources.map((s, i) => (
                <li key={i} className="ccw-source-chip" title={s.content}>
                  {truncate(s.content, 60)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {showTimestamp && (
        <span className="ccw-timestamp">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      )}
    </div>
  )
}

function truncate(text: string, n: number): string {
  return text.length > n ? `${text.slice(0, n)}…` : text
}
