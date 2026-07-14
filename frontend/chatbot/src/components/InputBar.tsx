import React, { useState, KeyboardEvent } from 'react'

interface InputBarProps {
  placeholder?: string
  disabled?: boolean
  onSend: (text: string) => void
}

export function InputBar({ placeholder, disabled, onSend }: InputBarProps) {
  const [value, setValue] = useState('')

  const handleSend = () => {
    if (!value.trim() || disabled) return
    onSend(value)
    setValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="ccw-input-bar">
      <textarea
        className="ccw-input"
        rows={1}
        value={value}
        placeholder={placeholder ?? 'Type a message…'}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label="Message input"
      />
      <button
        type="button"
        className="ccw-send-btn"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <SendIcon />
      </button>
    </div>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3.4 20.6 21 12 3.4 3.4 3.39 10 16 12l-12.6 2z"
        fill="currentColor"
      />
    </svg>
  )
}
