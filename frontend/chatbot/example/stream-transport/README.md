# Example — Stream (SSE) Transport

Shows the widget consuming a **real token-by-token stream** over Server-Sent
Events (SSE) — the same framing OpenAI/Anthropic-style LLM APIs use. This is
usually the right choice when you're calling an LLM server-side and want to
forward its stream straight through to the browser.

## Run it

```bash
# Terminal 1 — start the example backend
cd example/stream-transport
node server.js
# → Stream transport example server running at http://localhost:4002

# Terminal 2 — serve the page
cd example/stream-transport
npx serve .
```

Open the printed URL and chat — watch the reply type itself out live, word
by word. Try clicking "Stop generating" mid-reply.

## The contract

**Request** — `POST {endpoint}`, same body shape as HTTP transport:
```json
{ "message": "hello", "history": [{ "role": "user", "content": "..." }] }
```

**Response** — `Content-Type: text/event-stream`, then repeated lines:
```
data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" there"}}]}

data: [DONE]

```

`StreamTransport.ts` recognizes several JSON delta shapes automatically, so
you don't need to reformat your provider's output:

- `{ "delta": "text" }` — the simplest shape
- `{ "choices": [{ "delta": { "content": "text" } }] }` — OpenAI-compatible
- `{ "text": "..." }` or `{ "content": "..." }` — common alternates
- If the SSE payload isn't JSON at all, it's used as the raw text delta

The stream ends on `data: [DONE]` or when the HTTP response body closes.

## Two framing modes

```ts
protocol: {
  type: 'stream',
  endpoint: 'https://api.yourapp.com/chat/stream',
  format: 'sse'   // default — parses "data: ..." lines as above
}
```

```ts
protocol: {
  type: 'stream',
  endpoint: 'https://api.yourapp.com/chat/stream',
  format: 'text'  // no framing at all — response body bytes ARE the reply
}
```

Use `'text'` if your backend just pipes raw generated text straight into the
response body with no SSE wrapper — simpler to implement server-side, at the
cost of losing structured metadata per chunk.

## Wiring your real backend (e.g. OpenAI/Anthropic passthrough)

If you're calling an LLM provider server-side and forwarding its stream,
you often don't need to reformat anything — just proxy the provider's own
SSE stream through your `/chat/stream` route, since `StreamTransport.ts`
already understands the OpenAI-compatible `choices[0].delta.content` shape.

1. Point `endpoint` at your streaming route.
2. In that route, call your LLM provider with streaming enabled, and forward
   each chunk as an SSE `data: ...` line (or pipe the provider's stream
   directly through, if the shape already matches).
3. End with `data: [DONE]\n\n` and close the response.

No changes needed anywhere else in the widget — `stopGeneration()` already
aborts the fetch, which the browser turns into a closed connection your
server will see as the client disconnecting.

## Next in the series

- ✅ HTTP transport
- ✅ WebSocket transport
- ✅ Stream (SSE) transport (this example) — all three transports are now implemented
