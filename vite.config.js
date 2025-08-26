import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: '/tableserve',
  },
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    // Enable source maps for debugging in production (set to false for smaller bundles)
    sourcemap: false,
    // Minimize CSS
    minify: 'esbuild',
    // Set target for modern browsers
    target: 'es2015',
    // Optimize chunk size
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
          'ui-vendor': ['framer-motion', 'react-icons'],
          'utils-vendor': ['qrcode', 'qrcode.react', 'html2canvas', 'jspdf', 'aos']
        }
      }
    },
    // Report large chunks
    chunkSizeWarningLimit: 1000
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@reduxjs/toolkit',
      'react-redux',
      'framer-motion'
    ]
  }
})
