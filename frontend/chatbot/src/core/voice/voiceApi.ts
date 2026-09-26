// ============================================================================
// Voice transcription API call — plain fetch (matches this project's existing
// authApi.ts style, no axios dependency). Posts recorded audio to the backend
// Whisper endpoint and gets back { text, language, language_probability }.
// ============================================================================

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000') + '/api/v1'

export interface TranscribeResult {
  text: string
  language: string
  language_probability: number
}

/**
 * @param audioBlob   Recorded audio (webm/opus from MediaRecorder)
 * @param accessToken JWT — same token used for chat requests (RequireUser auth)
 */
export async function transcribeAudio(
  audioBlob: Blob,
  accessToken: string
): Promise<TranscribeResult> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.webm')

  const res = await fetch(`${API_BASE}/voice/transcribe`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
      // NOTE: do NOT set Content-Type here — the browser sets the correct
      // multipart/form-data boundary automatically when body is a FormData.
    },
    body: formData
  })

  if (!res.ok) {
    let message = `Transcription failed (${res.status})`
    try {
      const body = await res.json()
      if (typeof body?.detail === 'string') message = body.detail
    } catch {
      // ignore — use default message
    }
    throw new Error(message)
  }

  return res.json()
}