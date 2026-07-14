# React Chat Widget Kit

A themeable, responsive, protocol-agnostic, embeddable chat widget built with React.

> **Status:** Scaffold phase. Running on `mock` protocol with dummy data.
> Real HTTP / WebSocket / Stream wiring is the next step — see "Migration path" below.

## Features

- 🎨 **Themeable** — light/dark/auto, fully overridable via CSS custom properties
- 📱 **Responsive** — floating widget on desktop, full-screen on mobile
- ⚙️ **Configurable** — single `config` object drives all behavior, no hardcoded strings
- 🔌 **Multi-protocol** — HTTP, WebSocket, and LLM token streaming behind one interface
- ⚛️ **Pure React library** — tree-shakeable ESM + UMD, typed with TypeScript
- 🌍 **Embeddable anywhere** — npm package, Web Component (`<chat-widget>`), or plain `<script>` tag

## Project structure

```
chat-widget-lib/
├── src/
│   ├── core/
│   │   ├── types.ts               # Central type contracts (Config, Message, Theme, Transport)
│   │   ├── mockData.ts            # Dummy conversation data used by MockTransport
│   │   └── transports/
│   │       ├── Transport.ts       # Shared factory types/utils
│   │       ├── MockTransport.ts   # Simulated streaming replies (dummy data) — ACTIVE
│   │       ├── HttpTransport.ts   # Request/response REST — ✅ IMPLEMENTED, see example/http-transport/
│   │       ├── WebSocketTransport.ts  # Persistent socket protocol — ✅ IMPLEMENTED, see example/websocket-transport/
│   │       ├── StreamTransport.ts # SSE/fetch-stream (LLM tokens) — ✅ IMPLEMENTED, see example/stream-transport/
│   │       └── index.ts           # createTransport() factory — only file that picks a transport
│   ├── hooks/
│   │   └── useChat.ts             # Protocol-agnostic state layer (messages, typing, connection)
│   ├── themes/
│   │   ├── defaultTheme.ts        # Light/dark token sets + CSS var conversion
│   │   └── ThemeProvider.tsx      # Injects theme as CSS custom properties
│   ├── components/
│   │   ├── ChatWidget.tsx         # Main public component — also auto-injects CSS at runtime
│   │   ├── ChatWidget.css
│   │   ├── Header.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── TypingIndicator.tsx
│   │   ├── InputBar.tsx
│   │   └── LauncherButton.tsx
│   ├── embed/
│   │   ├── standalone.tsx         # IIFE bundle — window.ChatWidgetKit.init(...)
│   │   └── webcomponent.ts        # <chat-widget> custom element (Shadow DOM isolated)
│   ├── index.ts                   # npm package public exports
│   ├── App.tsx / main.tsx         # Internal Vite playground only — NOT shipped in the library
│   └── vite-env.d.ts
├── demo/
│   ├── index.html                 # Single-file embed demo — one <script> tag, dummy data, works standalone
│   ├── embed-standalone.js        # Copy of the built bundle (regenerate after changes, see demo/README.md)
│   └── README.md
├── example/
│   ├── script-embed/index.html    # Script-tag embed with a custom theme override
│   ├── web-component/index.html   # <chat-widget> custom element, proves Shadow DOM CSS isolation
│   ├── http-transport/            # Real backend example (Node, zero deps) — protocol: 'http'
│   ├── websocket-transport/       # Real backend example (Node + ws) — protocol: 'websocket'
│   ├── stream-transport/          # Real backend example (Node, zero deps) — protocol: 'stream' (SSE)
│   ├── react-app/                 # npm-package usage snippet for existing React apps
│   └── README.md
├── vite.config.ts                 # Dev server / internal playground build
├── vite.lib.config.ts             # npm package build (ESM + UMD)
├── vite.embed.config.ts           # Standalone `<script>` embed build (IIFE, single file, styles inlined)
├── vite.webcomponent.config.ts    # <chat-widget> custom element build (IIFE, single file)
└── tsconfig*.json
```

## Scripts

| Command                    | Purpose                                                             |
|-----------------------------|----------------------------------------------------------------------|
| `npm run dev`               | Launches the internal playground app (`src/App.tsx`) with mock data at `:5173` |
| `npm run build:demo`        | Builds the playground app (for previewing, not for distribution)     |
| `npm run build:lib`         | Builds everything: npm package + standalone embed + web component + `.d.ts` types |
| `npm run build:embed`       | Builds only `dist/embed-standalone.js` (single-file script embed)    |
| `npm run build:webcomponent`| Builds only `dist/embed-webcomponent.js` (`<chat-widget>` custom element) |
| `npm run typecheck`         | Type-checks the whole project with no emit                           |

## How the protocol abstraction works

Every transport (`HttpTransport`, `WebSocketTransport`, `StreamTransport`, `MockTransport`) implements the same `ChatTransport` interface:

```ts
interface ChatTransport {
  connect(): void
  disconnect(): void
  sendMessage(text: string, history: ChatMessage[]): void
  stopGeneration?(): void
}
```

The `useChat` hook and all UI components only ever talk to this interface — never to a concrete transport. Switching protocols is a **one-line config change**:

```ts
// Currently (scaffold phase):
protocol: { type: 'mock' }

// Step 2 — swap to any of these, zero UI code changes:
protocol: { type: 'http', endpoint: 'https://api.example.com/chat' }
protocol: { type: 'websocket', url: 'wss://api.example.com/chat' }
protocol: { type: 'stream', endpoint: 'https://api.example.com/chat/stream' }
```

## Migration path (dummy data → real API)

1. ✅ **Now:** `MockTransport` simulates a streaming bot reply client-side (word-by-word, with typing delay) so the entire UI/theme/layout can be built and demoed with zero backend.
2. **Next:** Fill in the `fetch()` / `WebSocket` / `ReadableStream` logic already stubbed in `HttpTransport.ts`, `WebSocketTransport.ts`, and `StreamTransport.ts` — the request/response shape is already documented in each file's comments.
3. **Then:** Flip `config.protocol.type` from `'mock'` to the real one. No component, hook, or CSS file needs to change.

## Embedding — one JS file, works anywhere

The whole point of the `embed/` build targets is that a host site needs **exactly
one `<script>` tag** — no separate CSS file, no bundler, no npm install:

```html
<script src="./embed-standalone.js"></script>
<script>
  ChatWidgetKit.init({
    target: '#chat-root',
    config: { botName: 'Bot', protocol: { type: 'mock' } }
  })
</script>
<div id="chat-root"></div>
```

This works because `ChatWidget.tsx` injects its CSS into `<head>` as a `<style>`
tag at runtime (see `injectStylesOnce()`) instead of relying on a separately
linked stylesheet — so `dist/embed-standalone.js` is fully self-contained.

- **`demo/`** — the minimal version of the above, ready to open/serve as-is.
- **`example/`** — three side-by-side patterns: script embed with a custom
  theme, `<chat-widget>` Web Component (Shadow DOM isolated), and React/npm
  usage. See `example/README.md`.

## Try it now

```bash
npm install
npm run dev            # internal playground with mock data at localhost:5173
npm run build:lib      # builds npm package + both embed bundles + types
```

Then open `demo/index.html` (serve it, e.g. `npx serve demo`) to see the
single-file embed working standalone. Type `hello`, `pricing`, or `help` to
see keyed dummy replies, or anything else for a simulated streamed response.

## Troubleshooting

**`Uncaught ReferenceError: process is not defined`** — this happens if the
embed bundles are rebuilt without the `define: { 'process.env.NODE_ENV': ... }`
line in `vite.embed.config.ts` / `vite.webcomponent.config.ts`. Bundled
React/ReactDOM check `process.env.NODE_ENV` internally; app-mode Vite builds
replace this automatically, but library/IIFE builds don't, and a plain
`<script>` tag has no Node `process` global. Both configs already include the
fix — don't remove it if you touch those files.

## Next steps

All three communication protocols are now fully implemented and tested
end-to-end against real example servers:

1. ✅ **HTTP transport** — `HttpTransport.ts`. Request/response, timeout +
   abort, optimistic user-message display, flexible response parsing, error
   handling. See `example/http-transport/`.
2. ✅ **WebSocket transport** — `WebSocketTransport.ts`. Persistent
   connection, JSON frame protocol, auto-reconnect with exponential backoff,
   message queuing while reconnecting, stop-frame for cancel-mid-stream. See
   `example/websocket-transport/`.
3. ✅ **Stream (SSE) transport** — `StreamTransport.ts`. Token-by-token
   streaming compatible with OpenAI/Anthropic-style APIs (auto-detects
   `{delta}`, `choices[0].delta.content`, `{text}`/`{content}` shapes), plus
   a raw `'text'` mode for unframed streaming backends. Abort-based stop
   generation. See `example/stream-transport/`.

Remaining nice-to-haves:

- `config-url` JSON-file support on the Web Component so non-technical
  users can configure it without writing JS (currently a documented stub
  in `src/embed/webcomponent.ts`).
- Swap any example server's canned `getReply()`/`getMockReply()` logic for
  a real LLM call once you're ready to go live.
