// ============================================================================
// PUBLIC API — this is the entire surface consumers import from
// `react-chat-widget-kit`. Keep this list intentional; anything not
// exported here is an internal implementation detail.
// ============================================================================

export { ChatWidget } from './components/ChatWidget'
export type { ChatWidgetProps } from './components/ChatWidget'

export { useChat } from './hooks/useChat'

export type {
  ChatWidgetConfig,
  ChatMessage,
  ChatTheme,
  ProtocolConfig,
  ProtocolType,
  ConnectionStatus,
  ChatTransport
} from './core/types'

export { lightTheme, darkTheme } from './themes/defaultTheme'
