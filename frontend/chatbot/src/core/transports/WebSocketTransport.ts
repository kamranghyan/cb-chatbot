import type { ChatTransport, TransportEvents, ChatMessage } from '../types'
import { generateId } from './Transport'

export interface WebSocketTransportConfig {
  /** Base WS URL, e.g. wss://api.yourapp.com/api/v1/chat/ws */
  url: string
  /**
   * JWT for `RequireUser` auth. Browsers can't set WS headers, so the
   * backend expects it as a query param: `?token=<JWT>`. If provided here,
   * this transport appends it to `url` automatically — don't also put it
   * in `url` yourself.
   */
  authToken?: string
  protocols?: string[]
  /** Auto-reconnect with backoff if the connection drops unexpectedly. Default true. */
  autoReconnect?: boolean
  /** Max reconnect attempts before giving up. Default 5. */
  maxReconnectAttempts?: number
}

/**
 * WebSocket transport for the RAG Chatbot Backend v2 (src/api/v1/chat.py
 * -> WS {url}?token=<JWT>). Multi-turn on one connection.
 *
 * CONFIRMED wire format, straight from the backend source:
 *
 *   client -> server:  {"question": "...", "external_chat_id": "..."|null, "is_regenerate": false}
 *   server -> client:  {"event": "meta",   "data": {"external_chat_id", "title"}}
 *                       {"event": "token",  "data": {"text": "..."}}          (repeated)
 *                       {"event": "sources","data": [{"content","metadata","score"}, ...]}
 *                       {"event": "done",   "data": {"external_conv_id", "response_time"}}
 *                       {"event": "error",  "data": {"message": "..."}}
 *
 * (Same event names/shape as StreamTransport's SSE — the backend runs the
 * exact same generator for both. Token payload key names are a defensive
 * best guess pending RagChatService.chat_stream() confirmation — see the
 * note in StreamTransport.ts.)
 *
 * Reconnection: if the socket drops unexpectedly (not via our own
 * disconnect()), we retry with exponential backoff (1s, 2s, 4s, 8s, 16s,
 * capped) up to `maxReconnectAttempts` before surfacing a final error.
 */
export class WebSocketTransport implements ChatTransport {
  readonly type = 'websocket' as const
  private config: WebSocketTransportConfig
  private events: TransportEvents
  private socket: WebSocket | null = null
  private manuallyDisconnected = false
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pendingQueue: string[] = []
  private activeStreamId: string | null = null
  private externalChatId: string | null = null

  constructor(config: WebSocketTransportConfig, events: TransportEvents) {
    this.config = config
    this.events = events
  }

  connect() {
    this.manuallyDisconnected = false
    this.openSocket()
  }

  disconnect() {
    this.manuallyDisconnected = true
    this.clearReconnectTimer()
    this.socket?.close()
    this.socket = null
  }

  stopGeneration() {
    // Backend has no documented "stop" frame yet — closing and reopening
    // is the safe fallback until one exists.
    this.socket?.close()
  }

  /** Resets the conversation — next sendMessage() starts a brand-new backend chat. */
  resetConversation() {
    this.externalChatId = null
  }

  sendMessage(text: string) {
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      status: 'sent',
      createdAt: Date.now()
    }
    this.events.onMessage(userMessage)

    const frame = JSON.stringify({
      question: text,
      external_chat_id: this.externalChatId,
      is_regenerate: false
    })

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(frame)
    } else {
      // Socket still (re)connecting — queue it and flush once open rather
      // than dropping the message or erroring immediately.
      this.pendingQueue.push(frame)
    }
  }

  private buildUrl(): string {
    if (!this.config.authToken) return this.config.url
    const sep = this.config.url.includes('?') ? '&' : '?'
    return `${this.config.url}${sep}token=${encodeURIComponent(this.config.authToken)}`
  }

  private openSocket() {
    this.events.onConnectionChange('connecting')
    try {
      this.socket = new WebSocket(this.buildUrl(), this.config.protocols)

      this.socket.onopen = () => {
        this.reconnectAttempts = 0
        this.events.onConnectionChange('connected')
        this.flushPendingQueue()
      }

      this.socket.onclose = (evt) => {
        this.events.onConnectionChange('disconnected')
        if (evt.code === 4401) {
          this.events.onError('Unauthorized — your session token is missing or expired')
          return
        }
        if (!this.manuallyDisconnected && this.config.autoReconnect !== false) {
          this.scheduleReconnect()
        }
      }

      this.socket.onerror = () => {
        this.events.onError('WebSocket connection error')
      }

      this.socket.onmessage = (evt) => this.handleFrame(evt.data)
    } catch (err) {
      this.events.onError(err instanceof Error ? err.message : 'WebSocket init failed')
      this.events.onConnectionChange('error')
    }
  }

  private flushPendingQueue() {
    if (!this.socket || this.pendingQueue.length === 0) return
    for (const frame of this.pendingQueue) {
      this.socket.send(frame)
    }
    this.pendingQueue = []
  }

  private scheduleReconnect() {
    const maxAttempts = this.config.maxReconnectAttempts ?? 5
    if (this.reconnectAttempts >= maxAttempts) {
      this.events.onError('Unable to reconnect after multiple attempts')
      this.events.onConnectionChange('error')
      return
    }
    this.reconnectAttempts += 1
    const delayMs = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 16000)
    this.events.onConnectionChange('connecting')
    this.reconnectTimer = setTimeout(() => this.openSocket(), delayMs)
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private handleFrame(raw: string) {
    let frame: { event?: string; data?: any }
    try {
      frame = JSON.parse(raw)
    } catch {
      this.events.onError('Received malformed WebSocket frame')
      return
    }

    const { event, data } = frame
    if (event === 'meta') {
      this.externalChatId = data?.external_chat_id ?? data?.chat_id ?? this.externalChatId
      if (this.activeStreamId === null) {
        this.activeStreamId = generateId()
        this.events.onMessage({
          id: this.activeStreamId,
          role: 'assistant',
          content: '',
          status: 'streaming',
          isStreaming: true,
          createdAt: Date.now()
        })
      }
    } else if (event === 'token') {
      const chunk = data?.text ?? data?.delta ?? data?.content ?? ''
      if (chunk && this.activeStreamId) this.events.onStreamChunk(this.activeStreamId, chunk)
    } else if (event === 'sources') {
      const sources = Array.isArray(data)
        ? data.map((s: any) => ({ content: s?.content ?? '', score: s?.score ?? null }))
        : []
      if (sources.length > 0 && this.activeStreamId) this.events.onSources?.(this.activeStreamId, sources)
    } else if (event === 'done') {
      if (this.activeStreamId) this.events.onStreamEnd(this.activeStreamId)
      this.activeStreamId = null
    } else if (event === 'error') {
      if (this.activeStreamId) this.events.onError(data?.message ?? 'Stream error', this.activeStreamId)
      else this.events.onError(data?.message ?? 'Stream error')
      this.activeStreamId = null
    }
  }
}
