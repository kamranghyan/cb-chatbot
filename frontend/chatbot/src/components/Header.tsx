import React from 'react'
import type { ConnectionStatus } from '../core/types'

interface HeaderProps {
  botName: string
  botAvatarUrl?: string
  connectionStatus: ConnectionStatus
  onClose: () => void
}

export function Header({ botName, botAvatarUrl, connectionStatus, onClose }: HeaderProps) {
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
      <button
        type="button"
        className="ccw-close-btn"
        onClick={onClose}
        aria-label="Close chat"
      >
        ×
      </button>
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
