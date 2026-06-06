import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')
  
  const isProduction = mode === 'production'

  // Normalize API base URL (often configured as e.g. http://localhost:8080/api/v1)
  // for use as a dev-server proxy target (which must be an origin, not a path).
  const getProxyOrigin = (rawUrl, fallbackOrigin) => {
    if (!rawUrl || typeof rawUrl !== 'string') return fallbackOrigin

    // If user config is a relative path like '/api', it's not a valid proxy target.
    if (rawUrl.startsWith('/')) return fallbackOrigin

    try {
      const u = new URL(rawUrl)
      u.pathname = ''
      u.search = ''
      u.hash = ''
      return u.toString().replace(/\/$/, '')
    } catch {
      return rawUrl
        .replace(/\/(api\/v\d+|api)\/?$/, '')
        .replace(/\/$/, '')
    }
  }

  const devApiProxyTarget = getProxyOrigin(env.VITE_API_BASE_URL, 'http://localhost:8080')
  const devWsProxyTarget = getProxyOrigin(env.VITE_WEBSOCKET_URL, devApiProxyTarget)
  
  return {
    plugins: [
      react({
        // Enable React Fast Refresh in development
        fastRefresh: command === 'serve',
        // Use SWC for faster builds in production
        babel: isProduction ? {
          plugins: [
            ['@babel/plugin-transform-runtime', { regenerator: false }]
          ]
        } : undefined
      })
    ],
    
    server: {
      host: true,
      port: 5173,
      open: true,
      cors: true,
      // Enable HTTP/2 in development
      https: false,
      // Proxy API requests to backend in development
      proxy: {
        '/api': {
          target: devApiProxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => {
            // Keep existing versioned paths as-is to avoid /api/v1 -> /api/v1/v1
            if (path.startsWith('/api/v1')) return path

            // Special-case health checks: backend exposes GET /health (not /api/v1/health)
            if (path === '/api/health') return '/health'

            // Default: treat /api/* as /api/v1/*
            return path.replace(/^\/api/, '/api/v1')
          }
        },
        '/socket.io': {
          target: devWsProxyTarget,
          changeOrigin: true,
          ws: true
        }
      }
    },
    
    css: {
      postcss: './postcss.config.js',
      // Enable CSS code splitting
      modules: {
        localsConvention: 'camelCase'
      }
    },
    
    build: {
      target: 'es2020',
      minify: 'esbuild',
      sourcemap: isProduction ? false : 'inline',
      // Optimize for production
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // Enable compression
      reportCompressedSize: true,
      // Add rollup options for better error handling
      emptyOutDir: true,
      
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          // Simplified chunking strategy to avoid export issues
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'redux-vendor': ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
            'ui-vendor': ['framer-motion', 'react-icons', 'react-toastify'],
            'chart-vendor': ['chart.js', 'react-chartjs-2'],
            'socket-vendor': ['socket.io-client'],
            'utils-vendor': ['axios', 'qrcode', 'qrcode.react', 'html2canvas', 'jspdf']
          },
          
          // Optimize asset naming
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.')
            const extType = info[info.length - 1]
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `assets/images/[name]-[hash][extname]`
            }
            if (/css/i.test(extType)) {
              return `assets/styles/[name]-[hash][extname]`
            }
            return `assets/[name]-[hash][extname]`
          },
          
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js'
        }
      }
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@reduxjs/toolkit',
        'react-redux',
        'redux-persist',
        'framer-motion',
        'socket.io-client',
        'axios',
        'react-toastify',
        'react-icons',
        'qrcode.react'
      ],
      exclude: ['@vite/client', '@vite/env'],
      // Force include problematic dependencies
      force: false
    },
    
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __IS_DEV__: !isProduction,
      // Ensure global is defined for compatibility
      global: 'globalThis',
    },
    
    // Resolve configuration
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@services': resolve(__dirname, 'src/services'),
        '@store': resolve(__dirname, 'src/store'),
        '@utils': resolve(__dirname, 'src/shared/utils'),
        '@hooks': resolve(__dirname, 'src/shared/hooks'),
        '@styles': resolve(__dirname, 'src/styles')
      }
    },
    
    // Preview configuration
    preview: {
      port: 5173,
      host: true
    }
  }
})
