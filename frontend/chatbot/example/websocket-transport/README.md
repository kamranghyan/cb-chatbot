# Example — WebSocket Transport

Shows the widget talking to a **persistent WebSocket connection**, with
replies streaming in word-by-word (simulating token-by-token LLM output)
and automatic reconnection if the connection drops.

## Run it

```bash
# Terminal 1 — install and start the example backend
cd example/websocket-transport
npm install
node server.js
# → WebSocket transport example server running at ws://localhost:4001

# Terminal 2 — serve the page
cd example/websocket-transport
npx serve .
```

Open the printed URL and chat. Try `hello` or `pricing`, or anything else
for an echo-style reply. Watch the header's status dot — it goes
Online/Connecting/Offline as the connection state changes.

## The frame contract

Plain JSON messages over the socket. See `server.js` for a working
reference implementation using the `ws` npm package.

**Client → server** (sent when the user hits send)
```json
{ "type": "message", "text": "hello" }
```

**Server → client** — stream chunks, then an end marker
```json
{ "type": "chunk", "id": "srv_123", "text": "Hello" }
{ "type": "chunk", "id": "srv_123", "text": " there" }
{ "type": "end", "id": "srv_123" }
```

**Server → client** — error
```json
{ "type": "error", "message": "Something went wrong", "id": "srv_123" }
```

**Client → server** — user clicked "Stop generating"
```json
{ "type": "stop", "id": "srv_123" }
```

## Reconnection behavior

If the socket closes unexpectedly (server restart, network blip),
`WebSocketTransport` retries automatically with exponential backoff:
1s → 2s → 4s → 8s → 16s (capped), up to `maxReconnectAttempts` (default 5)
before it gives up and surfaces an error. Messages sent while a
reconnect is in progress are queued and flushed once the socket reopens.

Try it: with the demo running, stop the server (Ctrl+C) mid-conversation,
then restart it — the widget recovers on its own.

## Config used on this page

```ts
protocol: {
  type: 'websocket',
  url: 'ws://localhost:4001',
  autoReconnect: true,           // optional, default true
  maxReconnectAttempts: 5        // optional, default 5
}
```

## Wiring your real backend

1. Point `url` at your real WebSocket endpoint (`wss://` in production).
2. Emit `chunk`/`end`/`error` frames matching the contract above — the
   `id` you choose per reply is up to you, just stay consistent within one
   reply's frames.
3. Handle the `stop` frame if you want to support cancel-mid-generation
   (e.g. abort your LLM call server-side).

No changes needed anywhere else in the widget.

## Next in the series

- ✅ HTTP transport
- ✅ WebSocket transport (this example)
- ⬜ LLM token streaming transport (SSE / fetch-stream)
