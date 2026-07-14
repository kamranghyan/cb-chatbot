import type { ChatTransport, TransportEvents, ChatMessage } from '../types'
import { generateId } from './Transport'

export interface HttpTransportConfig {
  /** Your backend endpoint, e.g. https://api.yourapp.com/chat */
  endpoint: string
  /** Extra headers — commonly used for auth: { Authorization: 'Bearer ...' } */
  headers?: Record<string, string>
  /** Abort the request if the server takes longer than this. Default 30s. */
  timeoutMs?: number
}

/**
 * HTTP transport — one request in, one full reply back. This is the
 * simplest protocol: no persistent connection, no token-by-token
 * streaming. Best fit for backends that call an LLM server-side and
 * return the finished answer.
 *
 * Contract your backend must implement:
 *
 *   POST {endpoint}
 *   Body:    { "message": "user text", "history": [{ role, content }] }
 *   Success: 200 { "reply": "assistant text" }   (or { "message": "..." })
 *   Error:   any non-2xx status — a JSON `{ "error": "..." }` body is read
 *            if present, otherwise the HTTP status code is shown.
 */
export class HttpTransport implements ChatTransport {
  readonly type = 'http' as const
  private config: HttpTransportConfig
  private events: TransportEvents
  private controller: AbortController | null = null

  constructor(config: HttpTransportConfig, events: TransportEvents) {
    this.config = config
    this.events = events
  }

  connect() {
    // No persistent connection for HTTP — report "connected" immediately
    // so the UI's status dot shows green, matching what a stateless REST
    // client would expect.
    this.events.onConnectionChange('connected')
  }

  disconnect() {
    this.controller?.abort()
    this.events.onConnectionChange('disconnected')
  }

  stopGeneration() {
    this.controller?.abort()
  }

  async sendMessage(text: string, history: ChatMessage[]) {
    // 1. Optimistically show the user's own message immediately — every
    //    other transport does this too, so the UI behaves identically
    //    regardless of which protocol is active.
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      status: 'sent',
      createdAt: Date.now()
    }
    this.events.onMessage(userMessage)

    // 2. Fire the request with a timeout guard so a hung backend doesn't
    //    leave the UI stuck on "typing…" forever.
    this.controller = new AbortController()
    const timeoutMs = this.config.timeoutMs ?? 30000
    const timeoutId = setTimeout(() => this.controller?.abort(), timeoutMs)

    this.events.onConnectionChange('connecting')

    try {
      const res = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.config.headers },
        body: JSON.stringify({
          message: text,
          // Trim internal fields the backend doesn't need
          history: history.map((m) => ({ role: m.role, content: m.content }))
        }),
        signal: this.controller.signal
      })

      if (!res.ok) {
        const errBody = await safeReadJson(res)
        throw new Error(errBody?.error ?? `Request failed with status ${res.status}`)
      }

      const data = await safeReadJson(res)
      const replyText = data?.reply ?? data?.message ?? ''

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: replyText,
        status: 'complete',
        createdAt: Date.now()
      }
      this.events.onMessage(assistantMessage)
      this.events.onConnectionChange('connected')
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      this.events.onError(
        isAbort ? 'Request timed out — please try again' : toErrorMessage(err)
      )
      this.events.onConnectionChange('error')
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

async function safeReadJson(res: Response): Promise<any | null> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'HTTP request failed'
}
