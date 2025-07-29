/**
 * Enhanced Web Push notifications handler for WAPPOPS
 * Optimized for mobile sleep mode, battery efficiency, and offline-first experience
 */

try {
  console.log('🔔 [SW] WAPPOPS Enhanced Push notification handlers loading...');

  // ✅ Enhanced install event - aggressive caching for offline-first experience
  self.addEventListener('install', (event) => {
    console.log('🔧 [SW] Installing service worker...');
    
    event.waitUntil(
      caches.open('wappops-critical-v1').then((cache) => {
        console.log('🔧 [SW] Caching critical resources for offline startup...');
        
        // Critical resources that MUST be available offline
        const criticalResources = [
          '/',
          '/index.html',
          '/pwa-512x512.png',
          '/favicon.ico'
          // Note: CSS and JS files are dynamically named with hashes, 
          // so they'll be handled by runtime caching
        ];
        
        return cache.addAll(criticalResources).then(() => {
          console.log('✅ [SW] Critical resources cached successfully');
          // Force activation of this service worker
          return self.skipWaiting();
        }).catch((error) => {
          console.error('❌ [SW] Failed to cache critical resources:', error);
          // Continue anyway - don't block the install
          return self.skipWaiting();
        });
      })
    );
  });

  // ✅ Enhanced activate event - clean up and take control immediately
self.addEventListener('activate', (event) => {
  console.log('🚀 [SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('wappops-') && !cacheName.includes('critical-v1')) {
              console.log('🗑️ [SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('✅ [SW] Service worker activated and ready');
    })
  );
});

// ✅ Enhanced fetch event - comprehensive offline fallback strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and Chrome extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    handleFetchRequest(event.request)
  );
});

// Comprehensive fetch handler with offline-first strategy
async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  // Detect development mode
  const isDevelopment = url.hostname === 'localhost' || 
                       url.hostname.includes('vite.') || 
                       url.port === '5173' || 
                       url.port === '5174';
  
  try {
    // For CSS files, handle differently in development vs production
    if (request.url.includes('.css') || request.destination === 'style') {
      
      if (isDevelopment) {
        // In development, always try network first to get latest CSS from Vite
        console.log('🔄 [SW] Development mode - fetching latest CSS:', url.pathname);
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            // Cache the fresh CSS for offline fallback
            const cache = await caches.open('wappops-css-priority');
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
        } catch (error) {
          console.log('⚠️ [SW] Network failed in dev mode, falling back to cache:', error.message);
        }
        
        // Fallback to cache if network fails in development
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          console.log('📦 [SW] Serving cached CSS in dev mode:', url.pathname);
          return cachedResponse;
        }
      } else {
        // Production mode - cache first for performance
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          console.log('📦 [SW] Serving CSS from cache:', url.pathname);
          return cachedResponse;
        }
        
        // If not cached, fetch and cache immediately
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const cache = await caches.open('wappops-css-priority');
          cache.put(request, networkResponse.clone());
          console.log('💾 [SW] Cached new CSS file:', url.pathname);
          return networkResponse;
        }
      }
      
      // Emergency fallback CSS if all else fails
      console.error('❌ [SW] Failed to load CSS from network and cache:', url.pathname);
      return new Response(
        `
        /* Emergency CSS fallback */
        body { font-family: Arial, sans-serif; margin: 20px; }
        .offline-banner { background: #ffeaa7; padding: 10px; text-align: center; }
        input, button { padding: 8px; margin: 4px; }
        button { background: #0984e3; color: white; border: none; cursor: pointer; }
        `,
        { headers: { 'Content-Type': 'text/css' } }
      );
    }

    // ✅ JavaScript files handling for mobile offline functionality
    if (request.url.includes('.js') || request.destination === 'script') {
      
      if (isDevelopment) {
        // Development: Network-first for latest JS from Vite
        console.log('🔄 [SW] Development mode - fetching latest JS:', url.pathname);
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open('wappops-js-priority');
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
        } catch (error) {
          console.log('⚠️ [SW] Network failed in dev mode, falling back to cached JS:', error.message);
        }
        
        // Fallback to cache if network fails in development
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          console.log('📦 [SW] Serving cached JS in dev mode:', url.pathname);
          return cachedResponse;
        }
      } else {
        // Production mode: For mobile offline, prioritize critical JS caching
        if (isCriticalResource(url.pathname)) {
          // Critical JS - cache first for fastest mobile loading
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            console.log('📦 [SW] Serving critical JS from cache:', url.pathname);
            return cachedResponse;
          }
        }
        
        // Non-critical or not cached - fetch and cache
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open('wappops-js-priority');
            cache.put(request, networkResponse.clone());
            console.log('💾 [SW] Cached JS file:', url.pathname);
            return networkResponse;
          }
        } catch (error) {
          // Network failed - try cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            console.log('📦 [SW] Serving JS from cache (network failed):', url.pathname);
            return cachedResponse;
          }
          console.error('❌ [SW] Failed to load JS from network and cache:', url.pathname);
          throw error; // Let it fall through to generic error handling
        }
      }
    }

    // For critical resources, try cache first
    if (isCriticalResource(url.pathname)) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('📦 [SW] Serving critical resource from cache:', url.pathname);
        return cachedResponse;
      }
    }

    // Try network first for all requests
    const networkResponse = await fetch(request);
    
    // Cache successful responses for future offline use
    if (networkResponse.ok && shouldCache(request)) {
      const cache = await caches.open('wappops-runtime-v1');
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('🌐 [SW] Network failed, trying cache for:', url.pathname);
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('📦 [SW] Serving from cache:', url.pathname);
      return cachedResponse;
    }
    
    // If it's a navigation request and we have no cache, serve index.html
    if (request.mode === 'navigate') {
      console.log('🏠 [SW] Serving index.html for navigation:', url.pathname);
      const indexResponse = await caches.match('/index.html');
      if (indexResponse) {
        return indexResponse;
      }
    }
    
    // Last resort - return a basic offline page
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>UBH Operaciones - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline { color: #666; }
          </style>
        </head>
        <body>
          <div class="offline">
            <h1>UBH Operaciones</h1>
            <p>No hay conexión a Internet</p>
            <p>Por favor, verifique su conexión e intente nuevamente.</p>
          </div>
        </body>
      </html>
      `,
      { 
        headers: { 'Content-Type': 'text/html' },
        status: 200
      }
    );
  }
}

// Helper function to identify critical resources
function isCriticalResource(pathname) {
  const criticalPaths = [
    '/',
    '/index.html',
    '/src/index.css',
    '/pwa-512x512.png',
    '/favicon.ico'
  ];
  
  // ✅ JavaScript files are critical for mobile offline functionality
  const isCriticalJS = pathname.includes('.js') && (
    pathname.includes('index-') ||  // Main bundle (e.g., index-ABC123.js)
    pathname.includes('workbox') || // Service worker
    pathname.includes('ubh-shell') || 
    pathname.includes('ubh-login')
  );
  
  return criticalPaths.includes(pathname) || 
         pathname.includes('ubh-shell') || 
         pathname.includes('ubh-login') ||
         isCriticalJS;
}

// Helper function to determine if a request should be cached
function shouldCache(request) {
  const url = new URL(request.url);
  
  // Don't cache API requests or external resources
  if (url.pathname.startsWith('/api/') || !url.origin.includes(location.origin)) {
    return false;
  }
  
  // Cache static resources
  return /\.(js|css|html|png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)$/.test(url.pathname);
}

// Enhanced push event handler optimized for mobile sleep mode
self.addEventListener('push', (event) => {
  console.log('🔔 [SW] Push event received:', event);
  
  // Fast-fail if no data to minimize processing time
  if (!event.data) {
    console.warn('🔔 [SW] Push event has no data');
    return;
  }

  // Use event.waitUntil to ensure the service worker stays alive
  event.waitUntil(
    handlePushNotification(event)
      .catch(error => {
        console.error('🔔 [SW] Critical error in push handler:', error);
        // Fallback notification to ensure user gets something
        return showFallbackNotification();
      })
  );
});

// Main push notification handler - optimized for speed
async function handlePushNotification(event) {
  const startTime = performance.now();
  
  try {
    const data = event.data.json();
    console.log('🔔 [SW] Push notification data received in', performance.now() - startTime, 'ms');

    // Mobile-optimized notification options
    const notificationOptions = createMobileOptimizedNotification(data);
    
    // Parallel execution for speed
    const promises = [
      // Show notification immediately
      self.registration.showNotification(
        data.title || 'UBH Operaciones',
        notificationOptions
      ),
      // Notify active clients (non-blocking)
      notifyActiveClients(data)
    ];

    await Promise.all(promises);
    console.log('🔔 [SW] Notification processed in', performance.now() - startTime, 'ms');
    
  } catch (error) {
    console.error('🔔 [SW] Error processing push notification:', error);
    throw error; // Re-throw to trigger fallback
  }
}

// Create mobile-optimized notification configuration
function createMobileOptimizedNotification(data) {
  const options = {
    body: data.body || 'Nueva notificación',
    icon: data.icon || '/pwa-512x512.png',
    badge: data.badge || '/favicon.ico',
    
    // 📱 Mobile Sleep Mode Optimizations
    tag: data.tag || `wappops-${data.id || Date.now()}`, // Unique tags
    data: data.data || {},
    
    // 🔊 Audio & Vibration (critical for sleep mode)
    silent: false,                              // Ensure sound is enabled
    vibrate: data.vibrate || [300, 100, 300, 100, 300], // Enhanced pattern
    
    // 📱 Mobile Interaction
    requireInteraction: true,                   // Keep visible until user acts
    renotify: data.renotify !== false,         // Allow re-notification
    
    // ⏰ Timestamp for ordering
    timestamp: Date.now(),
    
    // 🎯 Priority indicators
    urgency: data.urgency || 'high',           // Browser hint for importance
  };

  // Add enhanced actions for mobile
  if (data.actions && data.actions.length > 0) {
    options.actions = data.actions;
  } else {
    // Default mobile-friendly actions
    options.actions = [
      {
        action: 'open',
        title: '📱 Abrir App',
        icon: '/pwa-512x512.png'
      },
      {
        action: 'dismiss',
        title: '❌ Descartar'
      }
    ];
  }

  // Add image if provided (but keep it optional for speed)
  if (data.image) {
    options.image = data.image;
  }

  return options;
}

// Fast client notification (non-blocking)
async function notifyActiveClients(data) {
  try {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });
    
    console.log('🔔 [SW] Found', clientList.length, 'client windows');
    
    // Extract notification data efficiently
    const notificationData = data.data?.notification;
    
    if (notificationData && clientList.length > 0) {
      // Send to all clients in parallel (don't wait)
      const clientPromises = clientList.map(client => {
        try {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_RECEIVED',
            notification: notificationData,
            timestamp: Date.now()
          });
        } catch (error) {
          console.warn('🔔 [SW] Failed to message client:', client.url, error);
        }
      });
      
      // Don't wait for client messages to complete
      Promise.all(clientPromises).catch(error => {
        console.warn('🔔 [SW] Some client messages failed:', error);
      });
    }
  } catch (error) {
    console.warn('🔔 [SW] Error notifying clients (non-critical):', error);
  }
}

// Fallback notification for critical errors
function showFallbackNotification() {
  return self.registration.showNotification('UBH Operaciones', {
    body: 'Nueva notificación disponible',
    icon: '/pwa-512x512.png',
    badge: '/favicon.ico',
    tag: 'wappops-fallback',
    requireInteraction: true,
    vibrate: [300, 100, 300],
    silent: false,
    actions: [
      {
        action: 'open',
        title: '📱 Abrir App'
      }
    ]
  });
}

// Enhanced notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 [SW] Notification clicked:', event.notification.tag, 'Action:', event.action);
  
  event.notification.close();
  
  event.waitUntil(
    handleNotificationClick(event)
      .catch(error => {
        console.error('🔔 [SW] Error handling notification click:', error);
      })
  );
});

async function handleNotificationClick(event) {
  const { action, notification } = event;
  const notificationData = notification.data;
  
  // Handle dismiss action
  if (action === 'dismiss') {
    console.log('🔔 [SW] Notification dismissed by user');
    return;
  }
  
  // For all other actions, try to focus or open the app
  try {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });
    
    // Try to focus existing window first
    for (const client of clientList) {
      if (client.url.includes(self.location.origin)) {
        await client.focus();
        
        // Send the notification data to the focused client
        client.postMessage({
          type: 'NOTIFICATION_CLICKED',
          action: action,
          data: notificationData
        });
        
        console.log('🔔 [SW] Focused existing client:', client.url);
        return;
      }
    }
    
    // No existing window found, open new one
    const urlToOpen = self.location.origin + '/';
    await self.clients.openWindow(urlToOpen);
    console.log('🔔 [SW] Opened new window:', urlToOpen);
    
  } catch (error) {
    console.error('🔔 [SW] Error handling notification click:', error);
  }
}

// Service Worker lifecycle optimizations for mobile
self.addEventListener('install', (event) => {
  console.log('🔔 [SW] Installing enhanced push handler...');
  // Skip waiting to activate immediately (good for push notifications)
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🔔 [SW] Activating enhanced push handler...');
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

// Background sync for failed notifications (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-notification-sync') {
    console.log('🔔 [SW] Background sync triggered for notifications');
    event.waitUntil(retryFailedNotifications());
  }
});

async function retryFailedNotifications() {
  // Implementation for retrying failed notifications
  // This could be used to retry important notifications that failed during sleep mode
  console.log('🔔 [SW] Retrying failed notifications (placeholder)');
}

  console.log('🔔 [SW] Enhanced WAPPOPS Push notification handlers loaded ✅');

} catch (error) {
  console.error('❌ [SW] Failed to load push notification handlers:', error);
  // Don't let push handler errors break the main service worker
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handlePushNotification,
    createMobileOptimizedNotification,
    notifyActiveClients
  };
}
