import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Standalone embed build — a single self-contained IIFE script for
// non-React websites. Unlike the npm package, this bundles React itself
// (host sites can't be assumed to provide it), so a plain <script> tag is
// all a website needs to render the widget.
export default defineConfig({
  plugins: [react()],
  define: {
    // Bundled React/ReactDOM check process.env.NODE_ENV internally. In app
    // builds Vite replaces this automatically; library/IIFE builds don't,
    // so without this the browser throws "process is not defined" since
    // there's no Node `process` global in a plain <script> tag context.
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/embed/standalone.tsx'),
      formats: ['iife'],
      name: 'ChatWidgetKitEmbed',
      fileName: () => 'embed-standalone.js'
    },
    rollupOptions: {
      output: {
        // React/ReactDOM ARE bundled here (not external) — that's the
        // whole point of this build target vs. the npm package build.
      }
    },
    cssCodeSplit: false
  }
})
