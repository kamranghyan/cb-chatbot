import React from 'react'
import { createRoot } from 'react-dom/client'
import { ChatWidget } from '../components/ChatWidget'
import type { ChatWidgetConfig } from '../core/types'

// ============================================================================
// STANDALONE EMBED — built as a separate bundle (embed-standalone.js) so any
// website, React or not, can drop in:
//
//   <div id="my-chat-widget"></div>
//   <script src="https://cdn.example.com/embed-standalone.js"></script>
//   <script>
//     ChatWidgetKit.init({
//       target: '#my-chat-widget',
//       config: { botName: 'Support Bot', protocol: { type: 'mock' } }
//     })
//   </script>
//
// Step 2 will add: reading config from a `data-config-url` attribute so
// non-technical users can configure via a hosted JSON file instead of JS.
// ============================================================================

interface InitOptions {
  target: string | HTMLElement
  config: ChatWidgetConfig
}

function init({ target, config }: InitOptions) {
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (!el) {
    console.error(`[ChatWidgetKit] Target element "${target}" not found`)
    return
  }
  const root = createRoot(el)
  root.render(<ChatWidget config={config} />)
}

const ChatWidgetKit = { init }

// Attach to window so the plain <script> tag usage works without a bundler
if (typeof window !== 'undefined') {
  ;(window as unknown as { ChatWidgetKit: typeof ChatWidgetKit }).ChatWidgetKit =
    ChatWidgetKit
}

export default ChatWidgetKit
