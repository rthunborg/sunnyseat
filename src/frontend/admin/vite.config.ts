import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.maptiler\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
            },
          },
        ],
      },
      manifest: {
        name: 'SunnySeat - Find Sunny Patios in Gothenburg',
        short_name: 'SunnySeat',
        description: 'Discover sunny outdoor patios in Gothenburg with real-time sun forecasts',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0EA5E9',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
    visualizer({ 
      open: false, // Don't auto-open in CI
      gzipSize: true, 
      brotliSize: true,
      filename: './dist/stats.html',
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-map': ['maplibre-gl'],
          'vendor-chart': ['chart.js', 'react-chartjs-2'],
        },
      },
    },
    target: 'es2015',
    minify: 'esbuild', // Vite uses esbuild by default (faster than terser)
    cssCodeSplit: true,
    sourcemap: false, // Disable sourcemaps in production
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000, // Warn for chunks larger than 1MB
  },
  esbuild: {
    // Drop console and debugger in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
})
