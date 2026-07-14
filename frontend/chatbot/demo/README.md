# Demo — Single-file embed

This folder is a **plain static HTML page** with zero build tooling. It proves the
core embeddability requirement: drop in one `<script>` tag, and the chat widget
works — React, styles, and logic are all bundled inside `embed-standalone.js`.

## Run it

No build step needed — just serve the folder and open it:

```bash
cd demo
npx serve .
# or: python3 -m http.server 8080
```

Then open the printed local URL. (Opening the file directly via `file://` also
works in most browsers, but a local server avoids CORS quirks if you later
point `protocol` at a real HTTP/WebSocket endpoint.)

## Regenerating `embed-standalone.js`

This file is a copy of the build output. If you change anything in `src/`,
rebuild and re-copy it:

```bash
npm run build:embed
cp dist/embed-standalone.js demo/embed-standalone.js
```

## What to try

- Type `hello`, `pricing`, or `help` for keyed dummy replies (see `src/core/mockData.ts`)
- Anything else triggers a simulated word-by-word streamed reply
- Resize the browser to mobile width to see the full-screen mobile layout
