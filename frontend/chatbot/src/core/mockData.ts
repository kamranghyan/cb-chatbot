import type { ChatMessage } from './types'

// ============================================================================
// DUMMY DATA — used only by MockTransport so we can build/style/test the
// entire widget end-to-end before any real API/WS/LLM endpoint exists.
// Step 2 of the plan swaps MockTransport for Http/WebSocket/Stream without
// touching a single UI file.
// ============================================================================

export const seedMessages: ChatMessage[] = [
  {
    id: 'seed-1',
    role: 'assistant',
    content: "Hi! I'm the demo assistant. Ask me anything to test the widget.",
    status: 'complete',
    createdAt: Date.now() - 60000
  }
]

// Canned replies cycle in order; if a user types something matching a key,
// that specific reply is used instead — otherwise falls back to the pool.
const keyedReplies: Record<string, string> = {
  hello: 'Hey there! This is a mocked response streaming in token by token.',
  pricing: 'Our pricing is fully configurable — this text comes from dummy data for now.',
  help: "Sure, I'm happy to help. Once real endpoints are wired up, this will call your actual backend."
}

const fallbackReplies: string[] = [
  "Got it — that's a mocked reply so we can validate streaming, theming, and layout before connecting a real backend.",
  'Interesting question! This response is simulated with a small delay to mimic LLM token streaming.',
  "I'm running in mock mode right now. Swap the protocol config to 'http', 'websocket', or 'stream' to go live.",
  'This is dummy data. The transport layer is already abstracted, so switching to a real API is a one-line config change.'
]

let fallbackIndex = 0

export function getMockReply(userText: string): string {
  const key = Object.keys(keyedReplies).find((k) =>
    userText.toLowerCase().includes(k)
  )
  if (key) return keyedReplies[key]
  const reply = fallbackReplies[fallbackIndex % fallbackReplies.length]
  fallbackIndex += 1
  return reply
}
