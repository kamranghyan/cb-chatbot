# Examples

Three ways this widget can be embedded, and all three transport protocols,
each in its own folder:

| Folder            | Pattern                          | Use case                                   |
|--------------------|-----------------------------------|---------------------------------------------|
| `script-embed/`    | `<script>` tag, IIFE bundle       | Any static site, WordPress, Shopify, etc.   |
| `web-component/`   | `<chat-widget>` custom element    | Sites that want Shadow DOM CSS isolation    |
| `http-transport/`  | Real backend, `protocol: 'http'`  | Request/response, non-streaming backend     |
| `websocket-transport/` | Real backend, `protocol: 'websocket'` | Persistent connection, server-pushed streaming |
| `stream-transport/` | Real backend, `protocol: 'stream'` | SSE / OpenAI-style token-by-token streaming |
| `react-app/`       | npm package import                | Teams already building in React             |

`script-embed/`, `web-component/`, and all three transport examples are
fully static/self-running — open `index.html` (with its paired `server.js`
running) directly, no build step required. `react-app/` is a code snippet
meant to be copied into an existing React project.

See `../demo/` for the simplest possible version of the script-embed pattern.
