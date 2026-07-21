import React from 'react'
import type { ConnectionStatus } from '../core/types'

interface HeaderProps {
  botName: string
  botAvatarUrl?: string
  connectionStatus: ConnectionStatus
  onClose: () => void
  /** Optional — only passed by AuthenticatedChatWidget once a user is signed in. */
  onLogout?: () => void
}

export function Header({ botName, botAvatarUrl, connectionStatus, onClose, onLogout }: HeaderProps) {
  return (
    <div className="ccw-header">
      <div className="ccw-header-identity">
        <div className="ccw-avatar">
          {botAvatarUrl ? (
            <img src={botAvatarUrl} alt={botName} />
          ) : (
            <span>{botName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div>
          <div className="ccw-header-name">{botName}</div>
          <div className={`ccw-status ccw-status-${connectionStatus}`}>
            <span className="ccw-status-dot" />
            {statusLabel(connectionStatus)}
          </div>
        </div>
      </div>
      <div className="ccw-header-actions">
        {onLogout && (
          <button type="button" className="ccw-logout-btn" onClick={onLogout} aria-label="Sign out">
            Sign out
          </button>
        )}
        <button
          type="button"
          className="ccw-close-btn"
          onClick={onClose}
          aria-label="Close chat"
        >
          ×
        </button>
      </div>
    </div>
  )
}

function statusLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'Online'
    case 'connecting':
      return 'Connecting…'
    case 'error':
      return 'Connection error'
    case 'disconnected':
      return 'Offline'
    default:
      return ''
  }
}