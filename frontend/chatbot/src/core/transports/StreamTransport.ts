import type { ChatTransport, TransportEvents, ChatMessage, ChatMessageSource } from '../types'
import { generateId } from './Transport'

export interface StreamTransportConfig {
  /** RAG backend base, e.g. https://api.yourapp.com/api/v1 — POST {base}/chat/stream is called */
  endpoint: string
  /** Must include Authorization: 'Bearer <JWT>' — the host app supplies this (see README). */
  headers?: Record<string, string>
  /** Abort if no data arrives for this long. Default 30s. */
  timeoutMs?: number
}

/**
 * SSE stream transport for the RAG Chatbot Backend v2 (src/api/v1/chat.py
 * -> POST {endpoint}/stream, sse_starlette EventSourceResponse).
 *
 * IMPORTANT: this is POST-based SSE (question goes in the body), NOT the
 * browser's native EventSource (which is GET-only) — so we use fetch() +
 * a manual ReadableStream reader, per the backend's own docs.
 *
 * Wire format — named-event frames separated by a blank line:
 *
 *   event: meta
 *   data: {"external_chat_id": "...", "title": "..."}
 *
 *   event: token
 *   data: {"text": "..."}          (repeated, one per generated chunk)
 *
 *   event: sources
 *   data: [{"content": "...", "metadata": {...}, "score": 0.9}, ...]
 *
 *   event: done
 *   data: {"external_conv_id": "...", "response_time": 1.23}
 *
 *   event: error
 *   data: {"message": "..."}
 *
 * CONFIRMED from src/api/v1/chat.py. The exact key names *inside* each
 * `data` payload (e.g. whether tokens use "text" vs "delta") come from
 * RagChatService.chat_stream(), which wasn't in the files shared yet — this
 * parser reads `text`/`delta`/`content` for tokens and `external_chat_id`/
 * `chat_id` for meta as a defensive fallback so it keeps working either
 * way. Share that file to lock the exact names down and simplify this.
 */
export class StreamTransport implements ChatTransport {
  readonly type = 'stream' as const
  private config: StreamTransportConfig
  private events: TransportEvents
  private controller: AbortController | null = null
  private externalChatId: string | null = null

  constructor(config: StreamTransportConfig, events: TransportEvents) {
    this.config = config
    this.events = events
  }

  connect() {
    this.events.onConnectionChange('connected')
  }

  disconnect() {
    this.controller?.abort()
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
          question: text,
          external_chat_id: this.externalChatId,
          is_regenerate: false
        }),
        signal: this.controller.signal
      })

      if (!res.ok) {
        throw new Error(await extractHttpError(res))
      }
      if (!res.body) throw new Error('Response has no body to stream')

      this.events.onConnectionChange('connected')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let streamDone = false
      let receivedAnyToken = false

      while (!streamDone) {
        const result = await reader.read()
        if (result.done) break
        resetIdleTimer()
        buffer += decoder.decode(result.value, { stream: true })

        // SSE frames are separated by a blank line.
        const frames = buffer.split('\n\n')
        buffer = frames.pop() ?? '' // last (possibly incomplete) frame stays buffered

        for (const frame of frames) {
          const parsed = parseSseFrame(frame)
          if (!parsed) continue

          if (parsed.event === 'meta') {
            this.externalChatId = parsed.data?.external_chat_id ?? parsed.data?.chat_id ?? this.externalChatId
          } else if (parsed.event === 'token') {
            const chunk = parsed.data?.text ?? parsed.data?.delta ?? parsed.data?.content ?? ''
            if (chunk) {
              receivedAnyToken = true
              this.events.onStreamChunk(assistantId, chunk)
            }
          } else if (parsed.event === 'sources') {
            const sources = normalizeSources(parsed.data)
            if (sources.length > 0) this.events.onSources?.(assistantId, sources)
          } else if (parsed.event === 'done') {
            streamDone = true
          } else if (parsed.event === 'error') {
            throw new Error(parsed.data?.message ?? 'Stream error')
          }
        }
      }

      if (idleTimer) clearTimeout(idleTimer)
      if (!receivedAnyToken) {
        // Guardrail-blocked or empty pipeline result — don't leave a blank bubble.
        this.events.onStreamChunk(assistantId, "I don't have an answer for that yet.")
      }
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

interface ParsedSseFrame {
  event: string
  data: any
}

/** Parses one blank-line-delimited SSE frame (possibly multi-line `data:`). */
function parseSseFrame(frame: string): ParsedSseFrame | null {
  let event = 'message'
  const dataLines: string[] = []

  for (const rawLine of frame.split('\n')) {
    const line = rawLine.trimEnd()
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }

  if (dataLines.length === 0) return null
  const rawData = dataLines.join('\n')

  try {
    return { event, data: JSON.parse(rawData) }
  } catch {
    return { event, data: rawData }
  }
}

function normalizeSources(raw: any): ChatMessageSource[] {
  if (!Array.isArray(raw)) return []
  return raw.map((s) => ({ content: s?.content ?? '', score: s?.score ?? null }))
}

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
  return err instanceof Error ? err.message : 'Stream request failed'
}
