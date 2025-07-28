# 📱 Android Notification Setup Guide for WAPPOPS

## 🎯 Why This Guide is Important

When your device enters sleep mode, Android's battery optimization features may delay or block notifications from WAPPOPS. This guide will help you configure your Android device to ensure reliable notification delivery, even during extended sleep periods.

## ⚠️ Common Symptoms Without Proper Setup:
- ✅ Notifications work perfectly when app is active
- ❌ No sound/vibration after 30+ minutes of sleep
- ❌ Delayed notifications (15+ minutes late)
- ❌ Missing important operational alerts

---

## 📋 Step-by-Step Android Configuration

### 🔧 Step 1: Disable Battery Optimization for WAPPOPS

**This is the MOST IMPORTANT step** - Android's Doze mode will kill background processes to save battery.

#### Method A: Through App Settings
1. **Open Android Settings**
   - 📱 *Screen shows: Main Settings screen with search bar at top*
   - Look for gear icon ⚙️ in app drawer or notification panel

2. **Navigate to Apps**
   - 📱 *Screen shows: Settings menu with options like "Wi-Fi", "Bluetooth", "Apps"*
   - Tap "Apps" or "Application Manager" or "Apps & notifications"
   - **Note**: Exact wording varies by Android version/manufacturer

3. **Find WAPPOPS**
   - 📱 *Screen shows: List of all installed apps in alphabetical order*
   - Look for "WAPPOPS" or your hotel's app name
   - If using Chrome PWA, look for "universalbeachhotels.com" or similar
   - **Tip**: Use search icon 🔍 at top to find it quickly

4. **Open App Info**
   - 📱 *Screen shows: App icon, name, version, storage usage*
   - Tap on the WAPPOPS app entry

5. **Access Battery Settings**
   - 📱 *Screen shows: App info with options like "Storage", "Permissions", "Battery"*
   - Tap "Battery" or "Battery usage" or "Power management"
   - **Variations by manufacturer**:
     - Samsung: "Battery" → "Optimize battery usage"
     - Huawei: "Battery" → "App launch"
     - Xiaomi: "Battery saver" → "Battery optimization"

6. **Disable Optimization**
   - 📱 *Screen shows: Battery optimization toggle or dropdown*
   - **Option 1**: Toggle OFF "Optimize battery usage"
   - **Option 2**: Change dropdown from "Optimize" to "Don't optimize"
   - **Option 3**: Select "No restrictions" or "Allow background activity"

#### Method B: Through Battery Settings (Alternative)
1. **Settings** → **Battery** → **Battery Optimization**
2. **Tap dropdown** → Select "All apps" (not just "Not optimized")
3. **Find WAPPOPS** → Tap it → Select **"Don't optimize"**
4. **Confirm** → Tap "Done" or "Apply"

---

### 🔔 Step 2: Configure Notification Settings

#### A. Enable All Notification Types
1. **Settings** → **Apps** → **WAPPOPS** → **Notifications**
   - 📱 *Screen shows: Notification categories for the app*
   
2. **Enable Main Toggle**
   - 📱 *Screen shows: Master "Allow notifications" toggle at top*
   - Ensure this is **ON** ✅

3. **Configure Notification Categories**
   - 📱 *Screen shows: List of notification types like "General", "Alerts", etc.*
   - Enable all relevant categories:
     - ✅ **General notifications**
     - ✅ **Operational alerts**
     - ✅ **Task updates**
     - ✅ **Emergency notifications**

4. **Set Importance Level**
   - For each category, tap it and select:
     - **"High"** or **"Urgent"** for critical notifications
     - **"Medium"** for regular updates
   - 📱 *Screen shows: Importance slider or dropdown options*

#### B. Configure Sound & Vibration
1. **In Notification Settings** → **Sound**
   - 📱 *Screen shows: Sound picker with list of ringtones*
   - Select a **distinctive sound** (not "Silent" or "None")
   - **Recommended**: Choose a professional, attention-getting tone

2. **Enable Vibration**
   - 📱 *Screen shows: Vibration toggle and pattern options*
   - Ensure vibration is **ON** ✅
   - Select vibration pattern (usually "Default" works well)

3. **Lock Screen Display**
   - 📱 *Screen shows: Options for how notifications appear on locked screen*
   - Select **"Show all notification content"**
   - This ensures you see notifications even when device is locked

---

### 🚀 Step 3: Background App Refresh Settings

1. **Settings** → **Apps** → **WAPPOPS** → **Mobile data & Wi-Fi**
   - 📱 *Screen shows: Data usage options for the app*

2. **Enable Background Data**
   - ✅ **Allow background data usage**
   - ✅ **Allow data usage while Data saver is on**
   - 📱 *Screen shows: Two toggles that should both be enabled*

3. **Wi-Fi Background Activity**
   - ✅ **Allow background activity on Wi-Fi**
   - This ensures notifications work even on Wi-Fi

---

### ⚡ Step 4: Advanced Power Management (Manufacturer-Specific)

#### Samsung Devices
1. **Settings** → **Device care** → **Battery**
2. **App power management** → **Apps that won't be put to sleep**
3. **Add WAPPOPS** to the "Never sleeping apps" list
4. **Background app limits** → Set to "No limits" for WAPPOPS

#### Huawei/Honor Devices
1. **Settings** → **Battery** → **App launch**
2. **Find WAPPOPS** → Turn OFF "Manage automatically"
3. **Manual settings**:
   - ✅ Auto-launch
   - ✅ Secondary launch  
   - ✅ Run in background

#### Xiaomi/MIUI Devices
1. **Settings** → **Apps** → **Manage apps** → **WAPPOPS**
2. **Battery saver** → **No restrictions**
3. **Other permissions** → **Display pop-up windows while running in background** → ✅
4. **Autostart** → Enable for WAPPOPS

#### OnePlus/OxygenOS
1. **Settings** → **Battery** → **Battery optimization**
2. **Advanced optimization** → **Sleep standby optimization**
3. **Add WAPPOPS** to exception list

---

### 🌐 Step 5: Chrome PWA Specific Settings (If Applicable)

If you're using WAPPOPS as a Chrome PWA:

1. **Chrome Settings** → **Site Settings** → **Notifications**
   - 📱 *Screen shows: List of websites with notification permissions*
   - Find your WAPPOPS domain (e.g., "universalbeachhotels.com")
   - Ensure it's set to **"Allow"**

2. **Chrome Flags** (Advanced users only):
   - Type `chrome://flags` in address bar
   - Search for "notifications" 
   - Enable relevant PWA notification flags

---

## ✅ Testing Your Configuration

### Quick Test
1. **Open WAPPOPS** and ensure notifications are working
2. **Put device to sleep** for 5 minutes
3. **Have someone send a test notification**
4. **Check if you receive it with sound/vibration**

### Extended Test
Run this in WAPPOPS console:
```javascript
scheduleTestNotifications(); // From our mobile-sleep-test.js
```

### Expected Results:
- **0-5 minutes**: Immediate delivery ✅
- **5-30 minutes**: Within 1-2 minutes ✅  
- **30+ minutes**: Should still work with proper setup ✅

---

## 🔍 Troubleshooting Common Issues

### "I followed all steps but still have delays"

**Check These Additional Settings:**

1. **Developer Options** (if enabled):
   - **Settings** → **Developer options** → **Background check**
   - Disable "Background ANR" for WAPPOPS

2. **Data Saver Mode**:
   - **Settings** → **Network & internet** → **Data Saver**
   - Add WAPPOPS to "Unrestricted data" list

3. **Focus Mode / Do Not Disturb**:
   - Ensure WAPPOPS is allowed during DND periods
   - **Settings** → **Sound** → **Do Not Disturb** → **Exceptions**

### "Notifications work but no sound"

1. **Check notification channel sound settings** (per app)
2. **Verify device is not in silent mode**
3. **Check if notification sound file is valid**
4. **Test with different notification sounds**

### "Only works when app is open"

1. **Double-check battery optimization is disabled**
2. **Verify background data permissions**
3. **Check if "Background app refresh" is globally disabled**

---

## 📊 Manufacturer-Specific Quick Reference

| Manufacturer | Key Settings Location | Critical Setting |
|-------------|----------------------|------------------|
| **Samsung** | Device care → Battery → App power management | Never sleeping apps |
| **Huawei** | Battery → App launch | Manual management |
| **Xiaomi** | Apps → Manage apps → Battery saver | No restrictions |
| **OnePlus** | Battery → Battery optimization | Advanced optimization |
| **Google Pixel** | Apps → Special app access → Device admin | Battery optimization |
| **LG** | Battery → Battery usage → Ignore optimizations | App power saving |
| **Sony** | Battery → STAMINA mode | App exceptions |

---

## 🎯 Summary Checklist

Before closing this guide, ensure you've completed:

- [ ] **Battery optimization disabled** for WAPPOPS
- [ ] **All notification categories enabled** with sound
- [ ] **Background data usage allowed**
- [ ] **Manufacturer-specific power management configured**
- [ ] **Chrome PWA permissions set** (if applicable)
- [ ] **Tested with short sleep period** (5-10 minutes)
- [ ] **Tested with extended sleep period** (30+ minutes)

---

## 🆘 Still Having Issues?

If notifications still don't work after following this guide:

1. **Take screenshots** of your settings for technical support
2. **Note your exact Android version** and device model
3. **Test with other notification apps** to rule out device issues
4. **Contact your system administrator** with this guide completed

Remember: Some delay (5-15 minutes) during very deep sleep is normal Android behavior, even with perfect configuration. This affects ALL apps, including WhatsApp and other popular messengers.

---

*📱 Guide created for WAPPOPS v2025 - Universal Beach Hotels*  
*📅 Last updated: July 2025*
