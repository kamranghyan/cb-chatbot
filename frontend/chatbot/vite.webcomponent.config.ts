import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Web Component embed build — registers <chat-widget> as a custom element.
// Separate config from vite.embed.config.ts because IIFE builds only
// support a single entry point per Vite invocation.
export default defineConfig({
  plugins: [react()],
  define: {
    // See vite.embed.config.ts comment — same fix needed here since this
    // also bundles React/ReactDOM for direct browser <script> use.
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/embed/webcomponent.ts'),
      formats: ['iife'],
      name: 'ChatWidgetKitElement',
      fileName: () => 'embed-webcomponent.js'
    },
    cssCodeSplit: false
  }
})
