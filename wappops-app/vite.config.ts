import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0', // Listen on all interfaces for network access
    port: 5173,
    https: {
      key: fs.readFileSync('../ztest/cert/private.key'),
      cert: fs.readFileSync('../ztest/cert/certificate.crt'),
    },
    // Proxy disabled - client makes direct calls to backend
    hmr: true, // Force hot module reload
  },
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    injectRegister: 'auto',

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      name: 'UBH Operaciones',
      short_name: 'UBH Operaciones',
      description: 'Universal Beach Hotels - Aplicación de gestión de operaciones',
      theme_color: '#ffffff',
    },

    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
    },

    devOptions: {
      enabled: false,
      navigateFallback: 'index.html',
      suppressWarnings: true,
      type: 'module',
    },
  })],
})