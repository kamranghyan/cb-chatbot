// ============================================================================
// Minimal example WebSocket backend for WebSocketTransport.
// Uses the `ws` package (npm install ws) — Node has no built-in WS server.
//
// Frame contract (see src/core/transports/WebSocketTransport.ts):
//   client -> server:  { type: 'message', text }
//   server -> client:  { type: 'chunk', id, text }  (repeat per word/token)
//                       { type: 'end', id }
//                       { type: 'error', message, id? }
//                       { type: 'stop', id }  <- client can send this to cancel a stream
// ============================================================================

const { WebSocketServer } = require('ws')

const PORT = process.env.PORT || 4001
const wss = new WebSocketServer({ port: PORT })

console.log(`WebSocket transport example server running at ws://localhost:${PORT}`)

let idCounter = 0
function nextId() {
  idCounter += 1
  return `srv_${Date.now()}_${idCounter}`
}

function getReply(text) {
  const lower = text.toLowerCase()
  if (lower.includes('hello') || lower.includes('hi')) {
    return 'Hello! This is streaming to you over a real, persistent WebSocket connection.'
  }
  if (lower.includes('pricing')) {
    return 'Pricing info would normally come from your backend logic here.'
  }
  return `Echoing over WebSocket: "${text}" — replace getReply() in server.js with your real logic.`
}

wss.on('connection', (socket) => {
  console.log('Client connected')
  const stoppedStreams = new Set()

  socket.on('message', async (raw) => {
    let frame
    try {
      frame = JSON.parse(raw.toString())
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON frame' }))
      return
    }

    if (frame.type === 'stop') {
      stoppedStreams.add(frame.id)
      return
    }

    if (frame.type !== 'message') return

    const replyId = nextId()
    const words = getReply(frame.text).split(' ')

    for (let i = 0; i < words.length; i++) {
      if (stoppedStreams.has(replyId)) break
      await new Promise((r) => setTimeout(r, 40))
      const chunk = (i === 0 ? '' : ' ') + words[i]
      socket.send(JSON.stringify({ type: 'chunk', id: replyId, text: chunk }))
    }

    stoppedStreams.delete(replyId)
    socket.send(JSON.stringify({ type: 'end', id: replyId }))
  })

  socket.on('close', () => console.log('Client disconnected'))
})
