import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';
import fs from 'fs';

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
    registerType: 'autoUpdate', // Silent automatic updates without user intervention
    injectRegister: 'auto', // Automatic service worker registration

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      name: 'UBH Operaciones',
      short_name: 'UBH Operaciones',
      description: 'Universal Beach Hotels - Aplicación de gestión de operaciones',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      orientation: 'portrait-primary',
      
      // ✅ PWA Single Instance - Platform Native Approach
      // Chrome experimental feature - handles single instance natively
      // No additional JavaScript coordination needed
      launch_handler: {
        client_mode: ['focus-existing', 'auto']
      },
      
      // ✅ Enhanced display modes for better PWA integration
      display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
      
      // ✅ Prevent related app suggestions
      prefer_related_applications: false,
      
      // ✅ Categories for better app store classification
      categories: ['business', 'productivity'],
      
      // ✅ Screenshots for enhanced install experience (optional)
      screenshots: [
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          form_factor: 'narrow'
        }
      ]
    },

    // ✅ Silent PWA Updates Configuration
    // Updates are applied automatically without user intervention
    // Single instance behavior handled natively by platform manifest
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      
      // ✅ Runtime caching for offline support
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\/api\/notifications/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'notifications-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 86400 // 24 hours
            }
          }
        },
        {
          urlPattern: /^https:\/\/.*\/api\/login/,
          handler: 'NetworkOnly', // Always try network for auth
          options: {
            cacheName: 'auth-cache'
          }
        }
      ],
      
      // ✅ Enhanced navigation handling for PWA
      navigateFallback: 'index.html',
      navigateFallbackDenylist: [/^\/api/]
    },

    devOptions: {
      enabled: false,
      navigateFallback: 'index.html',
      suppressWarnings: true,
      type: 'module',
    },
  })],
})