import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind v4: replaces postcss pipeline entirely
  ],
  server: {
    port: 4001,
    proxy: {
      // Dev proxy: /api requests forwarded to Express API
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
