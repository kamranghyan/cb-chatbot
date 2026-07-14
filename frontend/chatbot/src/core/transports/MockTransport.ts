import type { ChatTransport, TransportEvents, ChatMessage } from '../types'
import { generateId } from './Transport'
import { getMockReply } from '../mockData'

const TYPING_DELAY_MS = 500
const TOKEN_INTERVAL_MS = 28

/**
 * MockTransport simulates an LLM-style streaming response entirely
 * client-side. It exists so the UI, theming, and layout can be built and
 * demoed with zero backend dependency. It implements the exact same
 * ChatTransport contract as Http/WebSocket/Stream, so replacing it later
 * is a one-line config change (`protocol: { type: 'mock' }` -> `{ type: 'http', endpoint }`).
 */
export class MockTransport implements ChatTransport {
  readonly type = 'mock' as const
  private events: TransportEvents
  private stopped = false

  constructor(events: TransportEvents) {
    this.events = events
  }

  connect() {
    this.events.onConnectionChange('connected')
  }

  disconnect() {
    this.events.onConnectionChange('disconnected')
  }

  stopGeneration() {
    this.stopped = true
  }

  async sendMessage(text: string) {
    this.stopped = false

    // Echo the user's message as "sent" immediately
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      status: 'sent',
      createdAt: Date.now()
    }
    this.events.onMessage(userMessage)

    // Simulate network/thinking delay before the bot starts "typing"
    await delay(TYPING_DELAY_MS)

    const replyText = getMockReply(text)
    const assistantId = generateId()

    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      isStreaming: true,
      createdAt: Date.now()
    }
    this.events.onMessage(assistantMessage)

    // Stream the reply word-by-word to simulate token streaming
    const words = replyText.split(' ')
    for (let i = 0; i < words.length; i++) {
      if (this.stopped) break
      await delay(TOKEN_INTERVAL_MS)
      const chunk = (i === 0 ? '' : ' ') + words[i]
      this.events.onStreamChunk(assistantId, chunk)
    }

    this.events.onStreamEnd(assistantId)
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
