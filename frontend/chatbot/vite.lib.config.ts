import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Library build config — produces the distributable npm package (ESM + UMD).
// NOTE: UMD/IIFE formats don't support multiple entry points, so the
// standalone embed bundle is built separately via vite.embed.config.ts.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'umd'],
      name: 'ReactChatWidgetKit',
      fileName: (format) =>
        format === 'es' ? 'react-chat-widget-kit.js' : 'react-chat-widget-kit.umd.cjs'
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    cssCodeSplit: false
  }
})
