import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // 'auto' injects the SW registration script — remove the manual inline
      // navigator.serviceWorker.register() from index.html (Plan 02 task).
      injectRegister: 'auto',
      manifest: {
        name: 'Rastreador de Recibos',
        short_name: 'Recibos',
        description: 'Gestiona y rastrea tus recibos y deudas',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // NEVER enable SW in dev — it intercepts API requests and causes hard-to-debug
      // issues where API calls appear to work but serve cached/stale data.
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
  build: {
    target: ['es2020', 'safari14', 'chrome87', 'firefox78', 'edge88'],
  },
  server: {
    port: 4001,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4001,
  },
});
