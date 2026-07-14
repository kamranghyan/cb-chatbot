import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Dev/demo entry point only — the library's real entry is src/index.ts
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
