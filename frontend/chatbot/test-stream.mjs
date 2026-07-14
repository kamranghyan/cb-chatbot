import { JSDOM } from 'jsdom'
import fs from 'fs'

const dom = new JSDOM(`<!doctype html><html><body><div id="chat-root"></div></body></html>`, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  resources: 'usable'
})

dom.window.fetch = (...args) => fetch(...args)
dom.window.AbortController = AbortController

const errors = []
dom.window.onerror = (msg) => errors.push('error: ' + msg)
dom.window.addEventListener('unhandledrejection', (e) => errors.push('unhandledrejection: ' + e.reason))

const script = dom.window.document.createElement('script')
script.textContent = fs.readFileSync('dist/embed-standalone.js', 'utf-8')
dom.window.document.head.appendChild(script)
await new Promise((r) => setTimeout(r, 200))

dom.window.ChatWidgetKit.init({
  target: '#chat-root',
  config: {
    botName: 'Stream Bot',
    startOpen: true,
    protocol: { type: 'stream', endpoint: 'http://localhost:4002/chat/stream' }
  }
})
await new Promise((r) => setTimeout(r, 200))

const textarea = dom.window.document.querySelector('.ccw-input')
const sendBtn = dom.window.document.querySelector('.ccw-send-btn')
const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set
setter.call(textarea, 'hello')
textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
sendBtn.dispatchEvent(new dom.window.Event('click', { bubbles: true }))

// ~18 words at 45ms each ≈ 800ms, wait generously
await new Promise((r) => setTimeout(r, 2500))

const bubbles = [...dom.window.document.querySelectorAll('.ccw-bubble')].map(b => b.textContent)
console.log('errors:', errors)
console.log('bubbles:', bubbles)

const ok = errors.length === 0 &&
  bubbles.some(b => b === 'hello') &&
  bubbles.some(b => b.includes('token by token over Server-Sent Events'))
console.log(ok ? 'PASS: real SSE stream round-trip works' : 'FAIL')

dom.window.close()
process.exit(ok ? 0 : 1)
