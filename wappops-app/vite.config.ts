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
    // Configure HMR to use the correct hostname
    hmr: {
      port: 5173,
      host: 'vite.universalbeachhotels.com'
    },
    // Proxy API calls to backend server for development
    proxy: {
      '/api': {
        target: 'https://localhost:3000',
        changeOrigin: true,
        secure: false, // For development with self-signed certificates
        rewrite: (path) => path
      }
    },
  },
  plugins: [VitePWA({
    registerType: 'autoUpdate', // Silent automatic updates without user intervention
    injectRegister: 'auto', // Automatic service worker registration
    
    // Development mode configuration
    devOptions: {
      enabled: true, // Enable PWA in development
      type: 'module', // Use ES modules for better development experience
      navigateFallback: 'index.html',
      suppressWarnings: true // Suppress development warnings
    },

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

    // ✅ Enhanced PWA Configuration for Offline-First Experience
    workbox: {
      // Pre-cache all essential static assets
      globPatterns: [
        '**/*.{js,css,html,svg,png,ico,woff,woff2}'
      ],
      
      // Ensure all files are included in the precache
      globDirectory: 'dist',
      
      // Clean up old caches automatically
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      
      // ✅ Import custom push notification handlers
      importScripts: ['push-handler.js'],
      
      // ✅ Enhanced runtime caching for comprehensive offline support
      runtimeCaching: [
        {
          // Cache critical JavaScript modules for mobile offline functionality
          urlPattern: /\.(?:js|ts)$/,
          handler: 'CacheFirst', // Changed to CacheFirst for mobile offline priority
          options: {
            cacheName: 'js-modules',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 86400 * 14 // Extended to 14 days for mobile offline
            }
          }
        },
        {
          // Cache CSS and styling for offline UI - HIGHEST PRIORITY
          urlPattern: /\.(?:css)$/,
          handler: 'CacheFirst', // Critical for unstyled content
          options: {
            cacheName: 'css-styles',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 86400 * 30 // 30 days for CSS
            }
          }
        },
        {
          // Cache all images and icons
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 86400 * 30 // 30 days
            }
          }
        },
        {
          // Cache fonts for offline typography
          urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'fonts',
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 86400 * 365 // 1 year
            }
          }
        },
        {
          // Cache Shoelace components and external libraries
          urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'external-libs',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 86400 * 7 // 7 days
            }
          }
        },
        {
          // API notifications - network first with fallback
          urlPattern: /^https:\/\/.*\/api\/notifications/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'notifications-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 86400 // 24 hours
            },
            networkTimeoutSeconds: 3
          }
        },
        {
          // Authentication - always try network
          urlPattern: /^https:\/\/.*\/api\/login/,
          handler: 'NetworkOnly',
          options: {
            cacheName: 'auth-cache'
          }
        },
        {
          // Other API calls - network first with cache fallback
          urlPattern: /^https:\/\/.*\/api\/.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 86400 * 2 // 2 days
            },
            networkTimeoutSeconds: 5
          }
        }
      ],
      
      // ✅ Enhanced navigation handling for SPA routing
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api/, /\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js)$/],
      
      // ✅ Ignore dev files and ensure production readiness
      dontCacheBustURLsMatching: /\.\w{8}\./,
      
      // ✅ Maximum cache size limits
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB
    },

  })],
})