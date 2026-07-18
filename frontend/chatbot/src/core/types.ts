// ============================================================================
// CORE TYPE CONTRACTS
// These types define the "shape" of the entire widget. Transports, UI
// components, and the embed layer all speak this shared language so any
// piece can be swapped independently (e.g. HttpTransport -> WsTransport)
// without touching UI code.
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageStatus =
  | 'sending'
  | 'sent'
  | 'streaming'
  | 'complete'
  | 'error'

export interface ChatMessageSource {
  content: string
  score?: number | null
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  status: MessageStatus
  createdAt: number
  /** Set true while an assistant message is still receiving stream chunks */
  isStreaming?: boolean
  error?: string
  /** RAG retrieval sources behind this answer, if the backend returned any */
  sources?: ChatMessageSource[]
}

export type ProtocolType = 'http' | 'websocket' | 'stream' | 'mock'

// ----------------------------------------------------------------------------
// Transport contract — every communication protocol (HTTP, WebSocket, SSE/
// fetch-stream, or Mock) implements this exact interface. The ChatEngine and
// UI never know which one is active.
// ----------------------------------------------------------------------------
export interface TransportEvents {
  onMessage: (message: ChatMessage) => void
  onStreamChunk: (id: string, chunkText: string) => void
  onStreamEnd: (id: string) => void
  onError: (error: string, messageId?: string) => void
  onConnectionChange: (status: ConnectionStatus) => void
  /** Optional — called when RAG retrieval sources arrive for a message, without touching its streamed content */
  onSources?: (id: string, sources: ChatMessageSource[]) => void
}

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

export interface ChatTransport {
  readonly type: ProtocolType
  connect: () => Promise<void> | void
  disconnect: () => void
  sendMessage: (text: string, history: ChatMessage[]) => Promise<void> | void
  /** Optional — WS/stream transports can request generation to stop */
  stopGeneration?: () => void
}

// ----------------------------------------------------------------------------
// Config schema — the single object a consumer passes to <ChatWidget /> or
// the standalone embed script. Everything about behavior/appearance is
// driven from here; no behavior should be hardcoded in components.
// ----------------------------------------------------------------------------
export interface ChatWidgetConfig {
  /** Bot identity */
  botName: string
  botAvatarUrl?: string
  welcomeMessage?: string
  placeholderText?: string

  /** Layout & positioning */
  position?: 'bottom-right' | 'bottom-left'
  launcherIcon?: 'chat' | 'sparkle' | 'custom'
  startOpen?: boolean
  fullScreenOnMobile?: boolean

  /** Feature toggles */
  showTypingIndicator?: boolean
  allowFileUpload?: boolean
  showTimestamps?: boolean
  persistHistory?: boolean

  /** Theme override (merged over default theme, see themes/defaultTheme.ts) */
  theme?: Partial<ChatTheme>

  /** Communication protocol configuration */
  protocol: ProtocolConfig
}

export type ProtocolConfig =
  | { type: 'http'; endpoint: string; headers?: Record<string, string> }
  | { type: 'websocket'; url: string; authToken?: string; protocols?: string[] }
  | { type: 'stream'; endpoint: string; headers?: Record<string, string> }
  | { type: 'mock' } // dummy data mode — used for this scaffold phase

export interface ChatTheme {
  colorScheme: 'light' | 'dark' | 'auto'
  accentColor: string
  accentContrastColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  mutedTextColor: string
  borderColor: string
  borderRadius: string
  fontFamily: string
  bubbleRadiusUser: string
  bubbleRadiusAssistant: string
}
