import type { Wappops } from '../wappops';

export class WebPushService {
  private _ctx: Wappops;
  private _subscription: PushSubscription | null = null;
  private _vapidKey: string | null = null;
  private _isInitialized = false;

  constructor(ctx: Wappops) {
    this._ctx = ctx;
  }

  /**
   * Initialize the Web Push service
   * Requests permission and subscribes if granted
   */
  public async initialize(): Promise<boolean> {
    if (this._isInitialized) {
      return true;
    }

    try {
      console.log('🔔 [CLIENT] Initializing WebPushService...');
      
      // Check if Web Push is supported
      if (!this.isSupported) {
        console.warn('🔔 [CLIENT] Web Push notifications are not supported in this browser');
        return false;
      }

      // Get VAPID key from server
      console.log('🔔 [CLIENT] Loading VAPID key from server...');
      await this._loadVapidKey();
      if (!this._vapidKey) {
        console.error('🔔 [CLIENT] Failed to load VAPID key from server');
        return false;
      }
      console.log('🔔 [CLIENT] ✅ VAPID key loaded successfully');

      // Request notification permission
      console.log('🔔 [CLIENT] Requesting notification permission...');
      const permission = await this.requestPermission();
      if (permission === 'granted') {
        console.log('🔔 [CLIENT] ✅ Notification permission granted');
        // Auto-subscribe if permission granted
        const subscription = await this.subscribe();
        if (subscription) {
          console.log('🔔 [CLIENT] ✅ Push subscription successful');
        } else {
          console.error('🔔 [CLIENT] ❌ Push subscription failed');
        }
      } else {
        console.warn('🔔 [CLIENT] ❌ Notification permission denied or dismissed');
      }

      this._isInitialized = true;
      console.log('🔔 [CLIENT] ✅ WebPushService initialization completed');
      return true;
    } catch (error) {
      console.error('🔔 [CLIENT] ❌ Failed to initialize Web Push service:', error);
      return false;
    }
  }

  /**
   * Request notification permission from user
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    let permission = Notification.permission;
    
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    return permission;
  }

  /**
   * Subscribe to push notifications
   */
  public async subscribe(): Promise<PushSubscription | null> {
    if (!this.isSupported || !this._vapidKey) {
      return null;
    }

    try {
      const serviceWorkerRegistration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      this._subscription = await serviceWorkerRegistration.pushManager.getSubscription();
      
      if (this._subscription) {
        // Already subscribed, register with server
        await this.registerWithServer(this._subscription);
        return this._subscription;
      }

      // Create new subscription
      this._subscription = await serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlB64ToUint8Array(this._vapidKey)
      });

      // Register subscription with server
      await this.registerWithServer(this._subscription);
      
      return this._subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  public async unsubscribe(): Promise<boolean> {
    if (!this._subscription) {
      return true;
    }

    try {
      // Unregister from server first
      await this.unregisterWithServer(this._subscription.endpoint);
      
      // Unsubscribe from browser
      const success = await this._subscription.unsubscribe();
      
      if (success) {
        this._subscription = null;
      }
      
      return success;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * Register subscription with server
   */
  public async registerWithServer(subscription: PushSubscription): Promise<boolean> {
    try {
      console.log('🔔 [CLIENT] Registering push subscription with server...');
      console.log('🔔 [CLIENT] Subscription endpoint:', subscription.endpoint);
      
      const response = await this._ctx.api.post('/api/notifications/push/subscribe', {
        subscription: subscription.toJSON()
      });

      const success = response?.success === true;
      if (success) {
        console.log('🔔 [CLIENT] ✅ Push subscription registered with server successfully');
      } else {
        console.error('🔔 [CLIENT] ❌ Server rejected push subscription registration:', response);
      }
      
      return success;
    } catch (error) {
      console.error('🔔 [CLIENT] ❌ Failed to register push subscription with server:', error);
      return false;
    }
  }

  /**
   * Unregister subscription from server
   */
  public async unregisterWithServer(endpoint: string): Promise<boolean> {
    try {
      const response = await this._ctx.api.post('/api/notifications/push/unsubscribe', {
        endpoint
      });

      return response?.success === true;
    } catch (error) {
      console.error('Failed to unregister push subscription from server:', error);
      return false;
    }
  }

  /**
   * Check if Web Push is supported
   */
  public get isSupported(): boolean {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
  }

  /**
   * Get current notification permission
   */
  public get permission(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Check if currently subscribed to push notifications
   */
  public get isSubscribed(): boolean {
    return this._subscription !== null;
  }

  /**
   * Get current push subscription
   */
  public get subscription(): PushSubscription | null {
    return this._subscription;
  }

  /**
   * Load VAPID public key from server
   */
  private async _loadVapidKey(): Promise<void> {
    try {
      const response = await this._ctx.api.get('/api/notifications/push/vapid-key');
      if (response?.publicKey) {
        this._vapidKey = response.publicKey;
      }
    } catch (error) {
      console.error('Failed to load VAPID key:', error);
    }
  }

  /**
   * Convert base64 URL to Uint8Array for VAPID key
   */
  private _urlB64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}
