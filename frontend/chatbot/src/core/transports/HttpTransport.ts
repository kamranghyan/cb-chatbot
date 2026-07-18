import type { ChatTransport, TransportEvents, ChatMessage } from '../types'
import { generateId } from './Transport'

export interface HttpTransportConfig {
  /** RAG backend base, e.g. https://api.yourapp.com/api/v1 — POST {base}/chat is called */
  endpoint: string
  /** Must include Authorization: 'Bearer <JWT>' — the host app supplies this (see README). */
  headers?: Record<string, string>
  /** Abort the request if the server takes longer than this. Default 30s. */
  timeoutMs?: number
}

/**
 * HTTP transport for the RAG Chatbot Backend v2 — one request in, one full
 * reply back (no token-by-token streaming; use StreamTransport for that).
 *
 * Exact backend contract (src/api/v1/chat.py -> POST {endpoint}):
 *
 *   Request:  { "question": string, "external_chat_id": string|null, "is_regenerate": boolean }
 *   Response: { "external_chat_id", "external_conv_id", "title",
 *               "answer": string|null, "response_time", "sources": [{content, metadata, score}] }
 *   Auth:     Authorization: Bearer <JWT> header (required — RequireUser dependency)
 *   Errors:   429 = rate limited (RATE_LIMIT_PER_MINUTE), 401/403 = bad/expired token,
 *             422 = validation error (FastAPI `detail` array)
 *
 * `answer: null` happens when the guardrail blocks the topic or the pipeline
 * genuinely has nothing to say — we render a fallback message rather than
 * leaving an empty bubble.
 *
 * This transport remembers `external_chat_id` internally after the first
 * reply so every following message continues the same backend chat/thread —
 * the widget consumer never has to manage that.
 */
export class HttpTransport implements ChatTransport {
  readonly type = 'http' as const
  private config: HttpTransportConfig
  private events: TransportEvents
  private controller: AbortController | null = null
  private externalChatId: string | null = null

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

  /** Resets the conversation — next sendMessage() starts a brand-new backend chat. */
  resetConversation() {
    this.externalChatId = null
  }

  async sendMessage(text: string) {
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      status: 'sent',
      createdAt: Date.now()
    }
    this.events.onMessage(userMessage)

    this.controller = new AbortController()
    const timeoutMs = this.config.timeoutMs ?? 30000
    const timeoutId = setTimeout(() => this.controller?.abort(), timeoutMs)

    this.events.onConnectionChange('connecting')

    try {
      const res = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.config.headers },
        body: JSON.stringify({
          question: text,
          external_chat_id: this.externalChatId,
          is_regenerate: false
        }),
        signal: this.controller.signal
      })

      if (!res.ok) {
        throw new Error(await extractHttpError(res))
      }

      const data = await safeReadJson(res)
      this.externalChatId = data?.external_chat_id ?? this.externalChatId

      const sources = Array.isArray(data?.sources)
        ? data.sources.map((s: any) => ({ content: s.content ?? '', score: s.score ?? null }))
        : undefined

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data?.answer ?? "I don't have an answer for that yet.",
        status: 'complete',
        createdAt: Date.now(),
        sources
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

/** FastAPI error bodies are either {"detail": "msg"} or {"detail": [{"msg": "...", "loc":[...]}]}. */
async function extractHttpError(res: Response): Promise<string> {
  const body = await safeReadJson(res)
  if (res.status === 429) return 'Too many messages — please wait a moment and try again.'
  if (res.status === 401 || res.status === 403) return 'Your session has expired. Please refresh and try again.'
  if (typeof body?.detail === 'string') return body.detail
  if (Array.isArray(body?.detail) && body.detail[0]?.msg) return body.detail[0].msg
  return `Request failed with status ${res.status}`
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
