import type { ProtocolConfig, TransportEvents, ChatTransport } from '../types'
import { MockTransport } from './MockTransport'
import { HttpTransport } from './HttpTransport'
import { WebSocketTransport } from './WebSocketTransport'
import { StreamTransport } from './StreamTransport'

/**
 * Single point of truth for "which transport do we use". Everything else
 * in the app (ChatEngine, hooks, components) only ever talks to the
 * ChatTransport interface — swapping protocols is purely a config change.
 */
export function createTransport(
  config: ProtocolConfig,
  events: TransportEvents
): ChatTransport {
  switch (config.type) {
    case 'http':
      return new HttpTransport(config, events)
    case 'websocket':
      return new WebSocketTransport(config, events)
    case 'stream':
      return new StreamTransport(config, events)
    case 'mock':
    default:
      return new MockTransport(events)
  }
}

export * from './Transport'
export { MockTransport, HttpTransport, WebSocketTransport, StreamTransport }
