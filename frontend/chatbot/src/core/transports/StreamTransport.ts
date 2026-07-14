import type { ChatTransport, TransportEvents, ChatMessage } from '../types'
import { generateId } from './Transport'

export interface StreamTransportConfig {
  /** Your streaming endpoint, e.g. https://api.yourapp.com/chat/stream */
  endpoint: string
  headers?: Record<string, string>
  /**
   * 'sse'  — Server-Sent Events framing: lines like `data: {...}\n\n`,
   *          terminated by `data: [DONE]`. This is what OpenAI/Anthropic-
   *          style APIs use. DEFAULT.
   * 'text' — raw text chunks with no framing at all — the response body
   *          itself IS the token stream. Simpler for custom backends.
   */
  format?: 'sse' | 'text'
  /** Abort if no data arrives for this long. Default 30s. */
  timeoutMs?: number
}

/**
 * Stream transport — a single HTTP request whose response body is read
 * incrementally as it arrives, for token-by-token LLM output. No persistent
 * connection (unlike WebSocket), but still feels "live" to the user.
 *
 * Contract your backend must implement — SSE mode (default):
 *
 *   POST {endpoint}
 *   Body: { "message": "...", "history": [{ role, content }] }
 *   Response: Content-Type: text/event-stream, then repeated:
 *
 *     data: {"delta":"Hello"}
 *     data: {"delta":" there"}
 *     data: [DONE]
 *
 *   Also understands the OpenAI-compatible shape
 *   `data: {"choices":[{"delta":{"content":"Hello"}}]}` automatically, and
 *   falls back to treating the payload as a plain text delta if it isn't
 *   JSON at all.
 *
 * 'text' mode: the raw response body bytes ARE the reply, decoded and
 * forwarded to the UI chunk by chunk with no parsing.
 */
export class StreamTransport implements ChatTransport {
  readonly type = 'stream' as const
  private config: StreamTransportConfig
  private events: TransportEvents
  private controller: AbortController | null = null

  constructor(config: StreamTransportConfig, events: TransportEvents) {
    this.config = config
    this.events = events
  }

  connect() {
    // Stateless like HTTP — no persistent connection to open.
    this.events.onConnectionChange('connected')
  }

  disconnect() {
    this.controller?.abort()
  }

  stopGeneration() {
    this.controller?.abort()
  }

  async sendMessage(text: string, history: ChatMessage[]) {
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      status: 'sent',
      createdAt: Date.now()
    }
    this.events.onMessage(userMessage)

    const assistantId = generateId()
    this.events.onMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      isStreaming: true,
      createdAt: Date.now()
    })

    this.controller = new AbortController()
    const timeoutMs = this.config.timeoutMs ?? 30000
    let idleTimer: ReturnType<typeof setTimeout> | null = null
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => this.controller?.abort(), timeoutMs)
    }

    this.events.onConnectionChange('connecting')

    try {
      resetIdleTimer()
      const res = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.config.headers },
        body: JSON.stringify({
          message: text,
          history: history.map((m) => ({ role: m.role, content: m.content }))
        }),
        signal: this.controller.signal
      })

      if (!res.ok) {
        const errBody = await safeReadJson(res)
        throw new Error(errBody?.error ?? `Request failed with status ${res.status}`)
      }
      if (!res.body) throw new Error('Response has no body to stream')

      this.events.onConnectionChange('connected')

      const format = this.config.format ?? 'sse'
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let done = false

      while (!done) {
        const result = await reader.read()
        done = result.done
        if (result.value) {
          resetIdleTimer()
          buffer += decoder.decode(result.value, { stream: true })

          if (format === 'text') {
            // Raw mode — forward everything immediately, no framing to parse.
            this.events.onStreamChunk(assistantId, buffer)
            buffer = ''
            continue
          }

          // SSE mode — process complete lines, keep any trailing partial
          // line in the buffer for the next chunk.
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            const delta = parseSseLine(line)
            if (delta === SSE_DONE) {
              done = true
              break
            }
            if (delta) this.events.onStreamChunk(assistantId, delta)
          }
        }
      }

      if (idleTimer) clearTimeout(idleTimer)
      this.events.onStreamEnd(assistantId)
    } catch (err) {
      if (idleTimer) clearTimeout(idleTimer)
      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      this.events.onError(
        isAbort ? 'Stream timed out or was stopped' : toErrorMessage(err),
        assistantId
      )
      this.events.onConnectionChange('error')
    }
  }
}

const SSE_DONE = Symbol('sse-done')

/** Parses one SSE line, returning the extracted text delta, SSE_DONE, or null (nothing to emit). */
function parseSseLine(line: string): string | typeof SSE_DONE | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return null

  const payload = trimmed.slice(5).trim()
  if (!payload) return null
  if (payload === '[DONE]') return SSE_DONE

  try {
    const json = JSON.parse(payload)
    // Try common shapes: our own {delta}, OpenAI-style choices[0].delta.content,
    // or a plain {text}/{content} field.
    const text =
      json.delta ??
      json.choices?.[0]?.delta?.content ??
      json.text ??
      json.content ??
      null
    return typeof text === 'string' ? text : null
  } catch {
    // Not JSON — treat the raw payload itself as the text delta.
    return payload
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
  return err instanceof Error ? err.message : 'Stream request failed'
}
