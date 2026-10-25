import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    dedupe: ['three'],
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        id: '/',
        name: 'moshimoshi — หาเพื่อนจากเรื่องที่ชอบ',
        short_name: 'moshimoshi',
        description: 'ห้องคุยตามเรื่องที่ชอบ เจอคนคลื่นเดียวกัน แล้วค่อยๆ สนิทกันแบบอุ่นใจ',
        lang: 'th',
        start_url: '/app?source=pwa',
        scope: '/',
        display: 'standalone',
        // no orientation lock: tablets, foldables and ChromeOS get the sidebar layouts
        orientation: 'any',
        background_color: '#FFF7EE',
        theme_color: '#FFF7EE',
        categories: ['social', 'lifestyle'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          // the stylesheet points at versioned font files: serve it from cache, refresh it in the background
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css', cacheableResponse: { statuses: [0, 200] } },
          },
          // the font files themselves never change
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React & friends first, so shared deps (scheduler, zustand…) never get pulled into the
          // three chunk: the 2D app must boot without downloading three/R3F
          if (/node_modules[\/](react|react-dom|scheduler|react-router|zustand|use-sync-external-store)[\/]/.test(id)) return 'react'
          if (id.includes('node_modules/three') || id.includes('@react-three')) return 'three'
          if (id.includes('node_modules/motion') || id.includes('framer-motion')) return 'motion'
        },
      },
    },
  },
})
