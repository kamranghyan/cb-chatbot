import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ChatWidget } from '../components/ChatWidget'
import type { ChatWidgetConfig } from '../core/types'
import widgetCss from '../components/ChatWidget.css?inline'

// ============================================================================
// WEB COMPONENT EMBED — registers <chat-widget> as a Custom Element with a
// Shadow DOM boundary, so host-page CSS can never leak in or clash with the
// widget's own styles.
//
// Usage on any website:
//   <script src="https://cdn.example.com/webcomponent.js" type="module"></script>
//   <chat-widget config-url="https://example.com/widget-config.json"></chat-widget>
//
// or inline config via a JS property:
//   document.querySelector('chat-widget').config = { botName: 'Bot', protocol: { type: 'mock' } }
//
// STUB NOTE: `config-url` fetching will be wired in Step 2. For now the
// element reads a `config` JS property (or falls back to mock/demo config)
// so the scaffold is testable end-to-end.
//
// KNOWN NUANCE: set `.config` as early as possible (immediately after
// customElements.whenDefined resolves). Once ChatWidget has mounted,
// re-assigning `.config` re-renders with new values like botName/theme,
// but it does NOT retroactively change already-initialized local UI state
// such as `isOpen` (React only reads `config.startOpen` on first mount).
// If you need to force the window open/closed after the fact, that's a
// good candidate for a future imperative `open()`/`close()` method on
// this element rather than relying on config re-assignment.
// ============================================================================

const DEFAULT_CONFIG: ChatWidgetConfig = {
  botName: 'Assistant',
  welcomeMessage: 'Hi! How can I help?',
  protocol: { type: 'mock' }
}

class ChatWidgetElement extends HTMLElement {
  private root: Root | null = null
  private _config: ChatWidgetConfig = DEFAULT_CONFIG

  static get observedAttributes() {
    return ['config-url']
  }

  set config(value: ChatWidgetConfig) {
    this._config = value
    this.render()
  }

  get config() {
    return this._config
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = widgetCss
    shadow.appendChild(style)

    const mountPoint = document.createElement('div')
    shadow.appendChild(mountPoint)

    this.root = createRoot(mountPoint)
    this.render()
  }

  disconnectedCallback() {
    this.root?.unmount()
  }

  private render() {
    this.root?.render(React.createElement(ChatWidget, { config: this._config }))
  }
}

if (typeof window !== 'undefined' && !customElements.get('chat-widget')) {
  customElements.define('chat-widget', ChatWidgetElement)
}

export { ChatWidgetElement }
