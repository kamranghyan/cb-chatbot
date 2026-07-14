import { JSDOM } from 'jsdom'
import fs from 'fs'

const dom = new JSDOM(`<!doctype html><html><body><div id="chat-root"></div></body></html>`, {
  url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true, resources: 'usable'
})
dom.window.fetch = (...args) => fetch(...args)
dom.window.AbortController = AbortController
const errors = []
dom.window.onerror = (msg) => errors.push(msg)

const script = dom.window.document.createElement('script')
script.textContent = fs.readFileSync('dist/embed-standalone.js', 'utf-8')
dom.window.document.head.appendChild(script)
await new Promise((r) => setTimeout(r, 200))

dom.window.ChatWidgetKit.init({
  target: '#chat-root',
  config: { botName: 'Stream Bot', startOpen: true, protocol: { type: 'stream', endpoint: 'http://localhost:4002/chat/stream' } }
})
await new Promise((r) => setTimeout(r, 200))

const textarea = dom.window.document.querySelector('.ccw-input')
const sendBtn = dom.window.document.querySelector('.ccw-send-btn')
const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set
setter.call(textarea, 'hello')
textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
sendBtn.dispatchEvent(new dom.window.Event('click', { bubbles: true }))

// Let a couple chunks arrive, then hit Stop
await new Promise((r) => setTimeout(r, 250))
const stopBtn = dom.window.document.querySelector('.ccw-stop-btn')
console.log('stop button visible:', !!stopBtn)
stopBtn?.dispatchEvent(new dom.window.Event('click', { bubbles: true }))

await new Promise((r) => setTimeout(r, 1500))
const bubbles = [...dom.window.document.querySelectorAll('.ccw-bubble')].map(b => b.textContent)
console.log('errors:', errors)
console.log('final assistant bubble (should be partial, not full sentence):', bubbles[1])

const isPartial = bubbles[1] && bubbles[1].length > 0 && !bubbles[1].includes('exactly like a real LLM API would')
console.log(isPartial ? 'PASS: stream stopped mid-generation' : 'FAIL (or reply completed before stop registered)')
dom.window.close()
process.exit(0)
