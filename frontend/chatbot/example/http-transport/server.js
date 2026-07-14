// ============================================================================
// Minimal example backend for HttpTransport — zero npm dependencies
// (plain Node `http` module) so it runs anywhere with just `node server.js`.
//
// This implements exactly the contract HttpTransport.ts expects:
//   POST /chat   body: { message, history }   -> { reply }
//
// Swap the canned `getReply()` logic for a real LLM call (OpenAI, Claude,
// your own model server, etc.) — everything else (CORS, JSON parsing,
// error shape) is already wired correctly for the widget to consume.
// ============================================================================

const http = require('http')

const PORT = process.env.PORT || 4000

function getReply(message, history) {
  const text = message.toLowerCase()
  if (text.includes('hello') || text.includes('hi')) {
    return `Hello! This reply came from a real HTTP POST to /chat — history has ${history.length} prior message(s).`
  }
  if (text.includes('pricing')) {
    return 'Our pricing page is at example.com/pricing. (Still a canned reply, but now served over real HTTP.)'
  }
  if (text.includes('error')) {
    // Lets you test the widget's error handling — type "error" to trigger this.
    return { __forceError: true }
  }
  return `You said: "${message}". Replace getReply() in server.js with a real LLM call whenever you're ready.`
}

const server = http.createServer((req, res) => {
  // CORS headers — required since the widget (served from a different
  // origin/port, e.g. file:// or :5500) is calling this server directly.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/chat') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const { message, history } = JSON.parse(body || '{}')
        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing "message" in request body' }))
          return
        }

        // Simulate realistic network/processing latency
        setTimeout(() => {
          const reply = getReply(message, history || [])
          if (reply && reply.__forceError) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Simulated server error (you typed "error")' }))
            return
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ reply }))
        }, 600)
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON body' }))
      }
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(PORT, () => {
  console.log(`HTTP transport example server running at http://localhost:${PORT}`)
  console.log(`POST http://localhost:${PORT}/chat  { "message": "hello", "history": [] }`)
})
