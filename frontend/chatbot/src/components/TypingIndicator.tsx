import React from 'react'

export function TypingIndicator() {
  return (
    <div className="ccw-row ccw-row-assistant" aria-live="polite" aria-label="Bot is typing">
      <div className="ccw-bubble ccw-bubble-assistant ccw-typing">
        <span className="ccw-dot" />
        <span className="ccw-dot" />
        <span className="ccw-dot" />
      </div>
    </div>
  )
}
