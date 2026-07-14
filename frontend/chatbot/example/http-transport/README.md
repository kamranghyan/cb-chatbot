# Example — HTTP Transport

Shows the widget talking to a **real backend** over plain HTTP (request in,
full reply back — no streaming, no persistent connection).

## Run it

```bash
# Terminal 1 — start the example backend
cd example/http-transport
node server.js
# → HTTP transport example server running at http://localhost:4000

# Terminal 2 — serve the page
cd example/http-transport
npx serve .
```

Open the printed URL and chat. Try `hello`, `pricing`, or `error` (to see
error handling in the widget — a red bubble with a retry-able error state).

## The contract

Your real backend needs to implement exactly this — see `server.js` for a
working zero-dependency reference implementation.

**Request** — `POST {endpoint}`
```json
{
  "message": "hello",
  "history": [
    { "role": "user", "content": "earlier message" },
    { "role": "assistant", "content": "earlier reply" }
  ]
}
```

**Success response** — `200 OK`
```json
{ "reply": "Hi! How can I help?" }
```
(`{ "message": "..." }` is also accepted as a fallback key.)

**Error response** — any non-2xx status
```json
{ "error": "Something went wrong" }
```
The widget shows this message directly in a red error bubble. If the body
isn't JSON or has no `error` key, it falls back to showing the HTTP status
code.

## Config used on this page

```ts
protocol: {
  type: 'http',
  endpoint: 'http://localhost:4000/chat',
  headers: { Authorization: 'Bearer <token>' }, // optional
  timeoutMs: 30000 // optional, default 30s — request auto-aborts after this
}
```

## Wiring your real backend

1. Point `endpoint` at your actual API route.
2. Add any auth headers you need via `headers`.
3. Make sure your route returns `{ "reply": "..." }` on success and a
   `{ "error": "..." }` JSON body (with a non-2xx status) on failure.
4. Make sure CORS is enabled if the widget is served from a different
   origin than your API (see the `Access-Control-Allow-*` headers in
   `server.js` for reference).

That's it — no changes needed anywhere else in the widget. `HttpTransport.ts`
already handles the request, timeout/abort, optimistic user-message display,
and error states.

## Next in the series

- ✅ HTTP transport (this example)
- ⬜ WebSocket transport
- ⬜ LLM token streaming transport
