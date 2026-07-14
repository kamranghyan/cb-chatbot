// ============================================================================
// Minimal example backend for StreamTransport — zero npm dependencies
// (plain Node `http` module). Streams a canned reply token-by-token as
// Server-Sent Events, the same framing OpenAI/Anthropic-style APIs use.
//
// Swap getReply() for a real LLM call — pipe your provider's own stream
// into res.write(`data: ${...}\n\n`) chunks and everything else here
// (headers, [DONE] marker, CORS) stays the same.
// ============================================================================

const http = require('http')

const PORT = process.env.PORT || 4002

function getReply(message) {
  const text = message.toLowerCase()
  if (text.includes('hello') || text.includes('hi')) {
    return "Hello! I'm streaming this reply token by token over Server-Sent Events, exactly like a real LLM API would."
  }
  if (text.includes('pricing')) {
    return 'Pricing details would come from your real backend logic — this is still a canned reply, just streamed.'
  }
  return `You said: "${message}". This whole sentence arrived as a series of small SSE chunks, not all at once.`
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/chat/stream') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', async () => {
      let message
      try {
        ;({ message } = JSON.parse(body || '{}'))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON body' }))
        return
      }
      if (!message) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Missing "message" in request body' }))
        return
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      })

      const words = getReply(message).split(' ')
      for (let i = 0; i < words.length; i++) {
        const delta = (i === 0 ? '' : ' ') + words[i]
        // OpenAI-compatible shape — StreamTransport also understands the
        // simpler { "delta": "..." } shape if you'd rather send that.
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`)
        await new Promise((r) => setTimeout(r, 45))
      }

      res.write('data: [DONE]\n\n')
      res.end()
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(PORT, () => {
  console.log(`Stream transport example server running at http://localhost:${PORT}`)
  console.log(`POST http://localhost:${PORT}/chat/stream  { "message": "hello", "history": [] }`)
})
