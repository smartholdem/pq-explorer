import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const hmrClientPort = env.VITE_HMR_CLIENT_PORT ? Number(env.VITE_HMR_CLIENT_PORT) : undefined
  return {
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'SmartHoldem PQ Explorer',
          short_name: 'STH Explorer',
          description: 'Block explorer for the SmartHoldem Post-Quantum network',
          theme_color: '#0A1128',
          background_color: '#0A1128',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          lang: 'en',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            { name: 'Delegates', url: '/delegates', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
            { name: 'Transactions', url: '/transactions', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          ],
        },
        workbox: {
          // app shell only; chain data always goes to the node (IndexedDB cache covers offline reads)
          globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } } },
          ],
        },
        devOptions: { enabled: true, type: 'module' },
      }),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      allowedHosts: true,
      hmr: hmrClientPort ? { clientPort: hmrClientPort, protocol: 'wss' } : undefined,
    },
  }
})
