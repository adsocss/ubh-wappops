# 📱 Mobile Sleep Mode Notification Issue - Complete Guide

## 🎯 **Root Cause Analysis**

### **Why Notifications Stop After Sleep:**

1. **Battery Optimization (Android)**
   - Android's Doze mode kicks in after 30+ minutes of inactivity
   - Background processes are heavily restricted
   - Push service connections may be suspended

2. **iOS Background App Refresh**
   - iOS restricts background activities very aggressively
   - Service Workers have limited execution time
   - Push notifications have delivery delays to save battery

3. **Browser Behavior**
   - Chrome/Safari may throttle Service Workers during deep sleep
   - Push event processing may be delayed or queued
   - Network connections can be suspended

## 🔧 **Solutions & Optimizations**

### **1. Service Worker Optimization** ✅

Your current service worker is well-structured, but here are key improvements:

#### **A. Fast Event Processing**
```javascript
// ✅ Your service worker already does this well:
event.waitUntil(Promise.all([showNotificationPromise, notifyAppPromise]));
```

#### **B. Minimize Processing Time**
- Keep push event handlers as fast as possible
- Avoid heavy operations in the Service Worker
- Use efficient data structures

#### **C. Proper Error Handling**
```javascript
// ✅ Your fallback is good:
event.waitUntil(
  self.registration.showNotification('UBH Operaciones', {
    body: 'Nueva notificación disponible',
    requireInteraction: true // ← This is important for mobile!
  })
);
```

### **2. Notification Configuration** 📋

#### **Current Settings Analysis:**
- ✅ `requireInteraction: true` - Keeps notification visible
- ✅ `vibrate: [200, 100, 200]` - Good vibration pattern
- ✅ `renotify: false` - Prevents spam

#### **Recommended Enhancements:**
```javascript
const mobileOptimizedOptions = {
  // ... your current options
  
  // 🔊 Audio Enhancement
  silent: false,  // Ensure sound is enabled
  
  // 📱 Mobile-Specific Settings
  requireInteraction: true,  // Keep visible until user acts
  renotify: true,           // Allow re-notification for important updates
  
  // 🔔 Persistent Notification
  tag: `wappops-${data.id || Date.now()}`, // Unique tags for multiple notifications
  
  // 📳 Enhanced Vibration
  vibrate: [300, 100, 300, 100, 300], // Longer pattern for sleep mode
  
  // 🎯 Priority Indication
  urgency: 'high', // Browser hint for importance
};
```

### **3. FCM Payload Optimization** 🚀

#### **Current FCM Usage:**
Your FCM integration looks good, but for mobile sleep mode:

```javascript
// 📡 Server-side FCM optimization (for your backend)
const fcmMessage = {
  token: deviceToken,
  notification: {
    title: title,
    body: body,
    icon: iconUrl,
  },
  data: {
    // Keep this minimal for fast processing
    notification: JSON.stringify(notificationData)
  },
  android: {
    priority: 'high',          // ← Critical for sleep mode
    ttl: 3600000,             // 1 hour TTL
    notification: {
      channel_id: 'wappops-important',
      priority: 'high',
      default_sound: true,
      default_vibrate_timings: true,
    }
  },
  apns: {
    headers: {
      'apns-priority': '10',   // ← Critical for iOS
      'apns-push-type': 'alert'
    },
    payload: {
      aps: {
        alert: {
          title: title,
          body: body
        },
        sound: 'default',
        badge: 1,
        'content-available': 1  // ← Enables background processing
      }
    }
  },
  webpush: {
    headers: {
      'Urgency': 'high',       // ← Critical for web push
      'TTL': '3600'
    }
  }
};
```

### **4. User Actions Required** 👤

#### **Android Users:**
1. **Disable Battery Optimization:**
   ```
   Settings → Battery → App optimization → [Your PWA] → Don't optimize
   ```

2. **Allow Background Activity:**
   ```
   Settings → Apps → [Your PWA] → Battery → Allow background activity
   ```

3. **Notification Channel Settings:**
   ```
   Settings → Apps → [Your PWA] → Notifications → Enable all
   ```

#### **iOS Users:**
1. **Enable Background App Refresh:**
   ```
   Settings → General → Background App Refresh → Enable for Safari/Chrome
   ```

2. **Notification Settings:**
   ```
   Settings → Notifications → [Your PWA] → Enable all options
   ```

## 🔍 **Testing Mobile Sleep Mode**

### **Test Scenarios:**
1. **Short Sleep (5-10 minutes):** Should work fine
2. **Medium Sleep (30+ minutes):** Android Doze mode activates
3. **Deep Sleep (1+ hours):** Maximum restrictions apply

### **Testing Script:**
Create this test to verify mobile behavior:

```javascript
// Add to your app for testing
function testMobileSleepMode() {
  console.log('📱 Starting mobile sleep mode test...');
  
  // Request a test notification after delays
  const delays = [1, 5, 10, 30, 60]; // minutes
  
  delays.forEach(delay => {
    setTimeout(() => {
      fetch('/api/send-test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Test after ${delay}min sleep`,
          body: `Mobile sleep test - ${delay} minutes`,
          urgency: 'high'
        })
      });
    }, delay * 60 * 1000);
  });
  
  console.log('📱 Test notifications scheduled for:', delays.join(', '), 'minutes');
}
```

## 🎯 **Expected Behavior**

### **Normal Behavior:**
- **0-5 minutes:** ✅ Immediate delivery with sound
- **5-30 minutes:** ✅ Delivery within 1-2 minutes
- **30+ minutes:** ⚠️ May be delayed up to 5-15 minutes (Android Doze)
- **1+ hours:** ⚠️ Significant delays possible (deep sleep)

### **Platform Differences:**
- **Android:** More predictable with proper optimization settings
- **iOS:** More aggressive restrictions, delays are normal
- **Desktop:** Generally reliable, less sleep restrictions

## 💡 **Recommendations**

1. **✅ Your current implementation is solid** - the issue is mostly platform-level restrictions

2. **📱 Add user education** - inform users about battery optimization settings

3. **🔊 Consider priority levels** - use high priority for critical notifications only

4. **⏰ Implement retry logic** - for critical notifications, consider multiple delivery attempts

5. **📊 Add analytics** - track notification delivery success rates

## 🚨 **Critical Understanding**

**This is NORMAL behavior** for mobile PWAs. Even native apps face similar restrictions. The key is:
- User education about battery settings
- Proper FCM priority configuration
- Realistic expectations about delivery timing

Your notification system is working correctly - the delays are due to mobile OS power management, not your code! 🎉
