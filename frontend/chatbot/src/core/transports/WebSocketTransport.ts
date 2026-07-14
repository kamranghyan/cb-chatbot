import type { ChatTransport, TransportEvents, ChatMessage } from '../types'
import { generateId } from './Transport'

export interface WebSocketTransportConfig {
  /** e.g. wss://api.yourapp.com/chat */
  url: string
  protocols?: string[]
  /** Auto-reconnect with backoff if the connection drops unexpectedly. Default true. */
  autoReconnect?: boolean
  /** Max reconnect attempts before giving up. Default 5. */
  maxReconnectAttempts?: number
}

/**
 * WebSocket transport — a persistent, bidirectional connection. Good fit
 * for chat backends that push messages proactively (agent handoff,
 * multi-user rooms) or want to avoid per-message HTTP overhead.
 *
 * JSON frame contract (see also example/websocket-transport/server.js):
 *
 *   client -> server:  { "type": "message", "text": "..." }
 *   server -> client:  { "type": "chunk", "id": "...", "text": "..." }   (repeat per token/word)
 *                       { "type": "end", "id": "..." }                   (stream finished)
 *                       { "type": "error", "message": "...", "id"?: "..." }
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
  /** Messages the user sent before the socket finished opening — flushed on open. */
  private pendingQueue: string[] = []
  /** Track the most recent assistant message id so stopGeneration() can target it. */
  private activeStreamId: string | null = null

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
    if (this.activeStreamId && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'stop', id: this.activeStreamId }))
    }
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

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'message', text }))
    } else {
      // Socket still (re)connecting — queue it and flush once open rather
      // than dropping the message or erroring immediately.
      this.pendingQueue.push(text)
    }
  }

  private openSocket() {
    this.events.onConnectionChange('connecting')
    try {
      this.socket = new WebSocket(this.config.url, this.config.protocols)

      this.socket.onopen = () => {
        this.reconnectAttempts = 0
        this.events.onConnectionChange('connected')
        this.flushPendingQueue()
      }

      this.socket.onclose = () => {
        this.events.onConnectionChange('disconnected')
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
    for (const text of this.pendingQueue) {
      this.socket.send(JSON.stringify({ type: 'message', text }))
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
    try {
      const frame = JSON.parse(raw)
      if (frame.type === 'chunk') {
        // First chunk for this id — create the placeholder assistant
        // message before appending, otherwise useChat's appendChunk has
        // no existing message to attach the text to.
        if (this.activeStreamId !== frame.id) {
          this.activeStreamId = frame.id
          this.events.onMessage({
            id: frame.id,
            role: 'assistant',
            content: '',
            status: 'streaming',
            isStreaming: true,
            createdAt: Date.now()
          })
        }
        this.events.onStreamChunk(frame.id, frame.text)
      } else if (frame.type === 'end') {
        this.activeStreamId = null
        this.events.onStreamEnd(frame.id)
      } else if (frame.type === 'error') {
        this.activeStreamId = null
        this.events.onError(frame.message, frame.id)
      }
    } catch {
      this.events.onError('Received malformed WebSocket frame')
    }
  }
}
