// ============================================================================
// Toggle-based voice recording hook. Click once -> starts recording (mic
// permission requested on first use). Click again -> stops, uploads, and
// resolves with the transcribed text via onTranscribed.
//
// Kept as a standalone hook (not baked into InputBar) so it's easy to test
// in isolation and drop into any input component.
// ============================================================================

import { useCallback, useRef, useState } from 'react'
import { transcribeAudio } from './voiceApi'

export type VoiceRecorderStatus = 'idle' | 'recording' | 'transcribing' | 'error'

interface UseVoiceRecorderOptions {
  accessToken: string | null | undefined
  onTranscribed: (text: string) => void
}

export function useVoiceRecorder({ accessToken, onTranscribed }: UseVoiceRecorderOptions) {
  const [status, setStatus] = useState<VoiceRecorderStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const stopStreamTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const startRecording = useCallback(async () => {
    if (!accessToken) {
      setErrorMessage('Not signed in')
      setStatus('error')
      return
    }

    setErrorMessage(null)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // webm/opus — small, widely supported, and what faster-whisper/ffmpeg
      // decode without issue on the backend.
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stopStreamTracks()
        const blob = new Blob(chunksRef.current, { type: mimeType })
        chunksRef.current = []

        if (blob.size === 0) {
          setStatus('idle')
          return
        }

        setStatus('transcribing')
        try {
          const result = await transcribeAudio(blob, accessToken)
          if (result.text) {
            onTranscribed(result.text)
          }
          setStatus('idle')
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : 'Transcription failed')
          setStatus('error')
        }
      }

      recorder.start()
      setStatus('recording')
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Microphone permission denied'
          : 'Could not access microphone'
      )
      setStatus('error')
    }
  }, [accessToken, onTranscribed])

  const stopRecording = useCallback(() => {
    // Triggers recorder.onstop above, which handles upload + transcription.
    mediaRecorderRef.current?.stop()
  }, [])

  const toggleRecording = useCallback(() => {
    if (status === 'recording') {
      stopRecording()
    } else if (status === 'idle' || status === 'error') {
      startRecording()
    }
    // no-op while 'transcribing' — ignore clicks mid-upload
  }, [status, startRecording, stopRecording])

  return { status, errorMessage, toggleRecording }
}