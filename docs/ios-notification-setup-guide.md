# 🍎 iOS Notification Setup Guide for WAPPOPS

## 🎯 Why This Guide is Important

iOS has very strict background processing limitations to preserve battery life. Without proper configuration, WAPPOPS notifications may be delayed or silent during sleep mode, especially after 30+ minutes of inactivity.

## ⚠️ Common Symptoms Without Proper Setup:
- ✅ Notifications work when Safari/Chrome is active
- ❌ Silent notifications after extended sleep
- ❌ Delayed delivery (up to 15+ minutes)
- ❌ No banner/sound for critical alerts

---

## 📋 Step-by-Step iOS Configuration

### 🔔 Step 1: Enable WAPPOPS Notifications

#### A. Through Safari/Chrome Settings
1. **Open Safari** and navigate to WAPPOPS
   - 🍎 *Screen shows: Safari browser with WAPPOPS loaded*
   
2. **Tap Share Button** → **Add to Home Screen**
   - 🍎 *Screen shows: Share sheet with various options*
   - Look for "Add to Home Screen" option
   - This creates a proper PWA icon

3. **Open WAPPOPS from Home Screen**
   - 🍎 *Screen shows: Home screen with WAPPOPS icon*
   - Tap the newly created WAPPOPS icon (not Safari)

4. **Grant Notification Permission**
   - 🍎 *Screen shows: iOS permission dialog for notifications*
   - Tap **"Allow"** when prompted
   - **Critical**: This must be done from the PWA, not Safari

#### B. Verify in iOS Settings
1. **Settings** → **Notifications**
   - 🍎 *Screen shows: List of all apps with notification permissions*
   
2. **Find WAPPOPS** entry
   - Look for "WAPPOPS" or your domain name
   - 🍎 *Screen shows: App listed among notification-enabled apps*

3. **Configure Notification Style**
   - 🍎 *Screen shows: Notification options for the specific app*
   - ✅ **Allow Notifications** (main toggle)
   - ✅ **Lock Screen** 
   - ✅ **Notification Center**
   - ✅ **Banners** → Select **"Persistent"**

---

### 🚀 Step 2: Background App Refresh

This is **CRITICAL** for iOS notification delivery:

1. **Settings** → **General** → **Background App Refresh**
   - 🍎 *Screen shows: Main Background App Refresh toggle and app list*

2. **Enable Main Toggle**
   - ✅ **Background App Refresh** (top toggle must be ON)
   - Choose **"Wi-Fi & Cellular Data"** for best coverage

3. **Enable for Safari/Chrome**
   - Scroll down to find **Safari** or **Chrome**
   - ✅ Enable toggle for your browser
   - 🍎 *Screen shows: List of apps with individual toggles*

4. **System-Wide Settings**
   - If using Chrome PWA: Enable **Chrome** background refresh
   - If using Safari PWA: Enable **Safari** background refresh

---

### ⚡ Step 3: Advanced iOS Settings

#### A. Screen Time & Restrictions
1. **Settings** → **Screen Time** → **App Limits**
   - 🍎 *Screen shows: App usage categories and limits*
   - Ensure WAPPOPS/Safari is **NOT** restricted during work hours

2. **Downtime Settings**
   - **Settings** → **Screen Time** → **Downtime**
   - Add WAPPOPS to **"Always Allowed"** apps list
   - 🍎 *Screen shows: Always Allowed apps section*

#### B. Focus Modes & Do Not Disturb
1. **Settings** → **Focus**
   - 🍎 *Screen shows: List of Focus modes like Work, Sleep, etc.*

2. **Configure Work/Custom Focus**
   - Tap your work-related Focus mode
   - **Apps** → **Add** → Select WAPPOPS/Safari
   - **People** → Allow work contacts

3. **Do Not Disturb Override**
   - In Focus settings → **Options**
   - Enable **"Time Sensitive"** notifications
   - This allows critical WAPPOPS alerts through DND

#### C. Cellular Data Settings
1. **Settings** → **Cellular** → **Safari** (or Chrome)
   - 🍎 *Screen shows: Cellular data usage for apps*
   - ✅ Enable cellular data for your browser
   - This ensures notifications work without Wi-Fi

---

### 🔧 Step 4: Browser-Specific Configuration

#### Safari PWA (Recommended)
1. **Safari Settings** → **Advanced** → **Experimental Features**
   - 🍎 *Screen shows: Advanced Safari settings*
   - Enable relevant PWA features (if available)

2. **Website Settings**
   - Navigate to WAPPOPS in Safari
   - Tap **"aA"** → **Website Settings**
   - **Notifications** → **Allow**
   - **Location** → **Ask** or **Allow** (if needed)

#### Chrome PWA (Alternative)
1. **Chrome Settings** → **Site Settings** → **Notifications**
   - 🍎 *Screen shows: Chrome notification settings*
   - Find WAPPOPS domain → Set to **"Allow"**

2. **Chrome Background Sync**
   - **Chrome Settings** → **Advanced** → **Site Settings**
   - **Background Sync** → **Allow** for WAPPOPS domain

---

### 🔋 Step 5: Battery & Performance Settings

#### A. Low Power Mode Configuration
1. **Settings** → **Battery** → **Low Power Mode**
   - 🍎 *Screen shows: Battery usage and Low Power Mode toggle*
   - **Important**: Low Power Mode severely restricts background activity

2. **Custom Low Power Settings** (iOS 15+)
   - When Low Power Mode activates, some notifications may be delayed
   - Consider disabling Low Power Mode during critical work periods

#### B. Optimized Battery Charging
1. **Settings** → **Battery** → **Battery Health & Charging**
   - 🍎 *Screen shows: Battery health information*
   - **Optimized Battery Charging** doesn't directly affect notifications
   - But can indicate overall battery health issues

---

## ✅ Testing Your iOS Configuration

### Quick Test Protocol
1. **Open WAPPOPS PWA** (from home screen, not Safari)
2. **Trigger a test notification** in the app
3. **Put device to sleep** for 5 minutes
4. **Wake device** and check for notification delivery

### Extended Sleep Test
1. **Configure test notifications** using our mobile test script
2. **Put device to sleep** for 30+ minutes
3. **Check delivery timing** and sound/vibration

### Test Script (Run in WAPPOPS Console):
```javascript
// Load our mobile test script
const script = document.createElement('script');
script.src = './mobile-sleep-test.js';
document.head.appendChild(script);

// Then run:
scheduleTestNotifications();
```

---

## 🔍 Troubleshooting iOS Issues

### "Notifications appear but no sound"

1. **Check Ringer/Silent Switch**
   - 🍎 Physical switch on side of device
   - Ensure device is not in silent mode

2. **Notification Sound Settings**
   - **Settings** → **Notifications** → **WAPPOPS**
   - **Sounds** → Select distinctive alert tone
   - **Critical Alerts** → Enable if available

3. **Volume Settings**
   - **Settings** → **Sounds & Haptics**
   - Adjust **Ringer and Alerts** volume

### "Long delays (15+ minutes)"

**This is often normal iOS behavior**, but check:

1. **Background App Refresh** globally enabled
2. **Focus modes** not blocking notifications
3. **Low Power Mode** disabled during work hours
4. **Cellular/Wi-Fi** connectivity stable

### "Notifications stop completely"

1. **Reset notification permissions**:
   - Remove WAPPOPS from home screen
   - Re-add via Safari → Share → Add to Home Screen
   - Re-grant notification permission

2. **Check iOS restrictions**:
   - **Settings** → **Screen Time** → **Content & Privacy Restrictions**
   - Ensure notifications aren't globally restricted

---

## 📊 iOS Version Differences

| iOS Version | Key Features | Configuration Notes |
|------------|--------------|-------------------|
| **iOS 14+** | Focus Modes | Configure work Focus to allow WAPPOPS |
| **iOS 15+** | Notification Summary | Disable summary for WAPPOPS (immediate delivery) |
| **iOS 16+** | Lock Screen widgets | Enhanced notification display options |
| **iOS 17+** | Interactive widgets | Improved PWA notification handling |

---

## 🎯 iOS-Specific Limitations

### Expected Behavior:
- **Active use**: ✅ Immediate notifications
- **Background (5-30 min)**: ✅ Usually within 1-2 minutes
- **Deep sleep (30+ min)**: ⚠️ Delays of 5-15 minutes are NORMAL
- **Low Power Mode**: ⚠️ Significant delays expected

### iOS Design Philosophy:
- Battery life prioritized over instant delivery
- Background processing heavily restricted
- Even native apps experience similar delays
- Critical notifications should be used sparingly

---

## ✅ iOS Summary Checklist

Ensure you've completed:

- [ ] **Added WAPPOPS to Home Screen** (as PWA)
- [ ] **Granted notification permission** from PWA (not browser)
- [ ] **Enabled Background App Refresh** (globally and for Safari/Chrome)
- [ ] **Configured Focus modes** to allow WAPPOPS
- [ ] **Set notification style** to Persistent Banners
- [ ] **Disabled notification summary** for WAPPOPS
- [ ] **Tested short sleep period** (5-10 minutes)
- [ ] **Verified sound and vibration** work

---

## 🆘 iOS Support Notes

### For System Administrators:
- iOS limitations are by design, not bugs
- Users need education about expected delays
- Critical alerts should be minimized
- Consider additional alerting methods for true emergencies

### For End Users:
- Some delay during deep sleep is normal
- Keep device charged and connected to Wi-Fi when possible
- Disable Low Power Mode during critical work periods
- Contact IT support with specific timing examples if issues persist

---

*🍎 Guide created for WAPPOPS v2025 - Universal Beach Hotels*  
*📅 Last updated: July 2025*  
*💡 iOS notification delays are normal behavior designed to preserve battery life*
