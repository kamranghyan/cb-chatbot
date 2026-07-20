# Integration with RAG Chatbot Backend v2

## What changed

| File | Change |
|---|---|
| `src/core/types.ts` | Added `ChatMessageSource`, `ChatMessage.sources`, `TransportEvents.onSources`, `authToken` on the websocket protocol config |
| `src/core/transports/HttpTransport.ts` | Rewritten to speak `POST /api/v1/chat` exactly: `{question, external_chat_id, is_regenerate}` → `{external_chat_id, external_conv_id, title, answer, response_time, sources}` |
| `src/core/transports/StreamTransport.ts` | Rewritten to parse the backend's named SSE events (`meta`/`token`/`sources`/`done`/`error`) instead of a generic single-field parser |
| `src/core/transports/WebSocketTransport.ts` | Rewritten to the confirmed WS frame format (`{question, external_chat_id, is_regenerate}` out, `{event, data}` in) and query-param token auth |
| `src/hooks/useChat.ts` | Added `onSources` handling — attaches retrieval sources to a message without resetting its streamed text |
| `src/components/MessageBubble.tsx` + `.css` | Renders source chips under assistant answers when present |
| `src/App.tsx` | Dev playground now targets the real backend via `.env.local`, with a transport switcher (http/stream/websocket/mock) for manual testing |
| `.env.example` | New — `VITE_API_BASE_URL`, `VITE_AUTH_TOKEN` for local dev only |

`MockTransport.ts` and `mockData.ts` are untouched — `protocol: { type: 'mock' }` still works for offline UI development/demos, per the library's own design.

## How a host app wires this up

The widget never logs anyone in. Whatever site/app embeds it is responsible
for obtaining a JWT (via its own login, or — for local dev only —
`POST /api/v1/auth/dev-token`) and handing it to the widget:

```ts
import { ChatWidget } from 'react-chat-widget-kit'

const config = {
  botName: 'Support Assistant',
  protocol: {
    type: 'http', // or 'stream' for token-by-token typing effect
    endpoint: 'https://your-backend.com/api/v1/chat',
    headers: { Authorization: `Bearer ${yourAppsJwt}` }
  }
}

<ChatWidget config={config} />
```

For WebSocket: `{ type: 'websocket', url: 'wss://your-backend.com/api/v1/chat/ws', authToken: yourAppsJwt }`
— the token is appended as `?token=...` automatically (browsers can't set WS headers).

### Which transport to pick
- **`http`** — simplest, one request/one reply. Good default.
- **`stream`** — token-by-token "typing" effect via SSE. Same backend pipeline, better perceived speed.
- **`websocket`** — persistent connection, same event protocol as `stream`. Pick this only if you need multi-turn on one socket for other reasons (e.g. avoiding per-message handshake overhead); functionally equivalent to `stream` otherwise.

## ⚠️ One thing left to confirm

`chat.py` confirms the SSE/WS **event names** (`meta`/`token`/`sources`/`done`/`error`)
and their **outer wrapper**, but the exact **field names inside each `data`
payload** live in `RagChatService.chat_stream()`, which wasn't in the files
shared so far. I implemented defensive parsing (`data.text ?? data.delta ??
data.content` for tokens, `data.external_chat_id ?? data.chat_id` for meta)
so streaming should work either way — but to lock this down exactly (and
simplify the parser), share:

```
docker compose exec backend cat src/services/rag_chat_service.py
```

I'll tighten `StreamTransport.ts`/`WebSocketTransport.ts` to the exact field
names once I see it — same pattern as the admin dashboard integration.

## Testing locally

```bash
cp .env.example .env.local
# fill in VITE_API_BASE_URL=http://localhost:8000
# get a token: curl -X POST http://localhost:8000/api/v1/auth/dev-token \
#   -H 'Content-Type: application/json' -d '{"email":"dev@local.test"}'
# paste the access_token into VITE_AUTH_TOKEN
npm run dev
```

The playground page has http/stream/websocket/mock buttons to switch
protocols live and compare behavior against the real backend.

## Production build (unaffected by this integration)

```bash
npm run build:lib   # npm package + standalone embed + web component, all three
```
