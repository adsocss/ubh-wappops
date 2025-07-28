// 📱 Mobile Sleep Mode Notification Tester
console.log('📱 [MOBILE TEST] Starting sleep mode notification analysis...');

// Test current notification setup
async function testMobileSleepMode() {
    console.log('\n🔍 MOBILE SLEEP MODE DIAGNOSTIC');
    console.log('=====================================');
    
    // 1. Check current notification permissions
    console.log('\n📋 1. NOTIFICATION PERMISSIONS:');
    if ('Notification' in window) {
        console.log('✅ Notification API available');
        console.log('🔑 Permission:', Notification.permission);
        
        if (Notification.permission === 'granted') {
            console.log('✅ Notifications are allowed');
        } else {
            console.log('❌ Notifications blocked - this will cause sleep mode issues');
            console.log('💡 User must enable notifications in browser settings');
        }
    } else {
        console.log('❌ Notification API not available');
    }
    
    // 2. Check service worker registration
    console.log('\n📋 2. SERVICE WORKER STATUS:');
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                console.log('✅ Service Worker registered');
                console.log('📍 Scope:', registration.scope);
                console.log('🔄 State:', registration.active?.state || 'unknown');
                
                // Check if push is supported
                if ('pushManager' in registration) {
                    console.log('✅ Push Manager available');
                    
                    const subscription = await registration.pushManager.getSubscription();
                    if (subscription) {
                        console.log('✅ Push subscription active');
                        console.log('🔑 Endpoint type:', subscription.endpoint.includes('fcm') ? 'FCM' : 'Other');
                    } else {
                        console.log('❌ No push subscription found');
                    }
                } else {
                    console.log('❌ Push Manager not available');
                }
            } else {
                console.log('❌ No Service Worker registered');
            }
        } catch (error) {
            console.log('❌ Service Worker error:', error.message);
        }
    } else {
        console.log('❌ Service Worker not supported');
    }
    
    // 3. Check mobile-specific settings
    console.log('\n📋 3. MOBILE DETECTION:');
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('📱 Mobile device:', isMobile ? '✅ Yes' : '❌ No');
    console.log('🌐 User Agent:', navigator.userAgent);
    
    if (isMobile) {
        console.log('\n📱 MOBILE-SPECIFIC CHECKS:');
        
        // Check if running as PWA
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;
        console.log('📱 Running as PWA:', isPWA ? '✅ Yes' : '❌ No');
        
        // Check network status (affects push delivery)
        console.log('🌐 Online status:', navigator.onLine ? '✅ Online' : '❌ Offline');
        
        // Check battery status (if available)
        if ('getBattery' in navigator) {
            try {
                const battery = await navigator.getBattery();
                console.log('🔋 Battery level:', Math.round(battery.level * 100) + '%');
                console.log('🔌 Charging:', battery.charging ? '✅ Yes' : '❌ No');
            } catch (error) {
                console.log('🔋 Battery status not available');
            }
        }
    }
    
    // 4. Test notification creation
    console.log('\n📋 4. NOTIFICATION TEST:');
    if (Notification.permission === 'granted') {
        try {
            // Create a test notification with mobile-optimized settings
            const testNotification = new Notification('📱 Mobile Sleep Test', {
                body: 'This is a test notification for mobile sleep mode',
                icon: '/pwa-512x512.png',
                badge: '/favicon.ico',
                tag: 'mobile-sleep-test',
                requireInteraction: true,
                vibrate: [300, 100, 300, 100, 300],
                silent: false,
                actions: [
                    {
                        action: 'test',
                        title: '✅ Test OK'
                    }
                ]
            });
            
            console.log('✅ Test notification created');
            
            // Auto-close after 5 seconds
            setTimeout(() => {
                testNotification.close();
                console.log('🔔 Test notification closed');
            }, 5000);
            
        } catch (error) {
            console.log('❌ Failed to create test notification:', error.message);
        }
    } else {
        console.log('⚠️ Cannot test notifications - permission required');
    }
    
    console.log('\n📋 5. SLEEP MODE BEHAVIOR EXPLANATION:');
    console.log('=====================================');
    console.log('⏰ Expected notification timing:');
    console.log('  • 0-5 minutes: ✅ Immediate delivery');
    console.log('  • 5-30 minutes: ✅ Within 1-2 minutes');
    console.log('  • 30+ minutes: ⚠️ Android Doze mode - delays possible');
    console.log('  • 1+ hours: ⚠️ Deep sleep - significant delays');
    console.log('');
    console.log('📱 Mobile OS restrictions (NORMAL behavior):');
    console.log('  • Android: Battery optimization affects background apps');
    console.log('  • iOS: Very strict background processing limits');
    console.log('  • Solution: User must whitelist app from battery optimization');
    console.log('');
    console.log('💡 User action required:');
    console.log('  Android: Settings → Battery → App optimization → [App] → Don\'t optimize');
    console.log('  iOS: Settings → General → Background App Refresh → Enable');
}

// Function to schedule test notifications
function scheduleTestNotifications() {
    console.log('\n🧪 SCHEDULING SLEEP MODE TESTS:');
    
    const delays = [1, 5, 10, 30]; // minutes
    
    delays.forEach(delay => {
        const timeoutId = setTimeout(() => {
            if (Notification.permission === 'granted') {
                new Notification(`⏰ Sleep Test - ${delay}min`, {
                    body: `Notification after ${delay} minutes of potential sleep`,
                    icon: '/pwa-512x512.png',
                    tag: `sleep-test-${delay}`,
                    requireInteraction: true,
                    vibrate: [300, 100, 300],
                    silent: false
                });
                console.log(`🔔 Sleep test notification sent after ${delay} minutes`);
            }
        }, delay * 60 * 1000);
        
        console.log(`⏰ Test notification scheduled for ${delay} minutes (ID: ${timeoutId})`);
    });
    
    console.log('💡 Put your device to sleep and wait for notifications!');
    console.log('📊 Check how long each notification takes to appear');
}

// Function to check FCM delivery optimization
function checkFCMOptimization() {
    console.log('\n📡 FCM DELIVERY OPTIMIZATION CHECK:');
    console.log('=====================================');
    
    console.log('✅ Your current FCM setup should include:');
    console.log('  • priority: "high" (Android)');
    console.log('  • apns-priority: "10" (iOS)');
    console.log('  • Urgency: "high" (Web Push)');
    console.log('  • TTL: reasonable value (1 hour)');
    console.log('');
    console.log('💡 If notifications still delay significantly:');
    console.log('  1. This is NORMAL mobile behavior for battery saving');
    console.log('  2. Even native apps face similar restrictions');
    console.log('  3. Critical notifications should be sent sparingly');
    console.log('  4. Consider user education about battery settings');
}

// Auto-run the test
testMobileSleepMode();

console.log('\n🎯 QUICK ACTIONS:');
console.log('================');
console.log('• Run scheduleTestNotifications() to test sleep mode');
console.log('• Run checkFCMOptimization() for delivery tips');
console.log('• Check mobile-sleep-mode-guide.md for complete solutions');

// Make functions available globally
window.testMobileSleepMode = testMobileSleepMode;
window.scheduleTestNotifications = scheduleTestNotifications;
window.checkFCMOptimization = checkFCMOptimization;
