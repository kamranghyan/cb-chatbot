// ============================================================================
// Toggle mic button — drop next to the existing Send button in InputBar.tsx.
// Visual states: idle (outline mic) -> recording (pulsing red) ->
// transcribing (spinner, disabled) -> back to idle. Error state shows a
// brief inline message and resets to idle on next click.
//
// Uses plain inline styles + the widget's existing --ccw-* CSS variables
// (same pattern as AuthPanel.css) so it matches the current theme without
// a new stylesheet import. Adjust the var names below if yours differ.
// ============================================================================

import React from 'react'
import { useVoiceRecorder } from '../core/voice/useVoiceRecorder'

interface MicButtonProps {
  accessToken: string | null | undefined
  onTranscribed: (text: string) => void
  disabled?: boolean
}

export function MicButton({ accessToken, onTranscribed, disabled }: MicButtonProps) {
  const { status, errorMessage, toggleRecording } = useVoiceRecorder({
    accessToken,
    onTranscribed
  })

  const isRecording = status === 'recording'
  const isTranscribing = status === 'transcribing'

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled || isTranscribing}
        aria-label={isRecording ? 'Stop recording' : 'Record voice message'}
        title={isRecording ? 'Stop recording' : 'Record voice message'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          cursor: isTranscribing ? 'default' : 'pointer',
          background: isRecording
            ? '#ef4444'
            : 'var(--ccw-button-bg, #f1f1f1)',
          color: isRecording ? '#fff' : 'var(--ccw-text-color, #333)',
          transition: 'background 0.15s ease',
          opacity: disabled || isTranscribing ? 0.6 : 1
        }}
      >
        {isTranscribing ? (
          <Spinner />
        ) : isRecording ? (
          <StopIcon />
        ) : (
          <MicIcon />
        )}
      </button>

      {isRecording && <PulseRing />}

      {status === 'error' && errorMessage && (
        <span
          style={{
            position: 'absolute',
            bottom: '110%',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            fontSize: 11,
            background: '#ef4444',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: 4
          }}
        >
          {errorMessage}
        </span>
      )}
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'ccw-spin 0.8s linear infinite' }}>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="42 14"
      />
      <style>{`@keyframes ccw-spin { to { transform: rotate(360deg) } }`}</style>
    </svg>
  )
}

function PulseRing() {
  return (
    <span
      style={{
        position: 'absolute',
        inset: -4,
        borderRadius: '50%',
        border: '2px solid #ef4444',
        animation: 'ccw-pulse 1.2s ease-out infinite',
        pointerEvents: 'none'
      }}
    >
      <style>{`
        @keyframes ccw-pulse {
          0%   { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </span>
  )
}