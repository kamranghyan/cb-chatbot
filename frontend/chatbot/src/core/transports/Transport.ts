import type { ChatTransport, TransportEvents, ProtocolConfig } from '../types'

// ============================================================================
// Transport factory + shared utilities.
// Every transport (Http/WebSocket/Stream/Mock) is constructed the same way:
// `createTransport(protocolConfig, events)` — the UI layer (ChatEngine)
// never imports a concrete transport directly, only this factory.
// ============================================================================

export function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export type TransportFactory = (
  config: ProtocolConfig,
  events: TransportEvents
) => ChatTransport
