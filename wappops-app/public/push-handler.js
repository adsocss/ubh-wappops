/**
 * Web Push notifications handler for WAPPOPS
 * This script is injected into the Workbox-generated Service Worker
 */

console.log('🔔 [SW] WAPPOPS Push notification handlers loading...');

// Handle push events
self.addEventListener('push', (event) => {
  console.log('🔔 [SW] Push event received:', event);
  
  if (!event.data) {
    console.warn('🔔 [SW] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('🔔 [SW] Push notification data:', data);

    const notificationOptions = {
      body: data.body || 'Nueva notificación',
      icon: data.icon || '/pwa-512x512.png',
      badge: data.badge || '/favicon.ico',
      tag: data.tag || 'wappops-notification',
      data: data.data || {},
      requireInteraction: data.requireInteraction !== false,
      actions: data.actions || [],
      timestamp: Date.now(),
      // Visual enhancements
      vibrate: data.vibrate || [200, 100, 200],
      silent: data.silent || false,
      renotify: data.renotify || false,
    };

    // Add default action if none provided
    if (!notificationOptions.actions.length) {
      notificationOptions.actions = [
        {
          action: 'open',
          title: 'Abrir',
          icon: '/pwa-512x512.png'
        },
        {
          action: 'close',
          title: 'Cerrar'
        }
      ];
    }

    // Show the notification
    const showNotificationPromise = self.registration.showNotification(
      data.title || 'UBH Operaciones',
      notificationOptions
    );

    // Notify the main application about the received notification
    const notifyAppPromise = self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      console.log('🔔 [SW] Found', clientList.length, 'client windows');
      
      // Send the notification data to all active clients for processing
      // The notification data comes from the server in lightweight format
      const notificationData = data.data?.notification;
      
      if (notificationData) {
        clientList.forEach(client => {
          console.log('🔔 [SW] Sending notification data to client:', client.url);
          client.postMessage({
            type: 'PUSH_NOTIFICATION_RECEIVED',
            notification: notificationData
          });
        });
      } else {
        console.warn('🔔 [SW] No notification data found in push payload');
        console.log('🔔 [SW] Available data:', data.data);
      }
    });

    event.waitUntil(Promise.all([showNotificationPromise, notifyAppPromise]));
    
  } catch (error) {
    console.error('🔔 [SW] Error processing push notification:', error);
    
    // Fallback notification if data parsing fails
    event.waitUntil(
      self.registration.showNotification('UBH Operaciones', {
        body: 'Nueva notificación disponible',
        icon: '/pwa-512x512.png',
        badge: '/favicon.ico',
        tag: 'wappops-fallback',
        requireInteraction: true,
        actions: [
          {
            action: 'open',
            title: 'Abrir'
          }
        ]
      })
    );
  }
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click event:', event);
  
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  // Handle different actions
  if (action === 'close') {
    // Just close the notification
    return;
  }

  // Default action or 'open' action - open/focus the app
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // Try to focus an existing client first
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no existing client found, open a new window
      if (clients.openWindow) {
        const targetUrl = notificationData.url || '/';
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle notification close events (optional)
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
  
  // Optional: Track notification dismissals
  const notificationData = event.notification.data || {};
  if (notificationData.trackDismissal) {
    // Could send analytics or tracking data here
    console.log('🔔 [SW] Tracking notification dismissal for:', event.notification.tag);
  }
});

console.log('🔔 [SW] ✅ WAPPOPS Push notification handlers registered successfully');
