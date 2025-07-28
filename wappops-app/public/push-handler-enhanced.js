/**
 * Enhanced Web Push notifications handler for WAPPOPS
 * Optimized for mobile sleep mode and battery efficiency
 */

console.log('🔔 [SW] WAPPOPS Enhanced Push notification handlers loading...');

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

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handlePushNotification,
    createMobileOptimizedNotification,
    notifyActiveClients
  };
}
