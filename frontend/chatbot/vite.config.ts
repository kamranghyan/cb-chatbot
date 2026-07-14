import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev/demo config — runs the playground app in src/App.tsx
// so we can visually build & test the widget with dummy data
// before wiring real API endpoints.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  }
})
