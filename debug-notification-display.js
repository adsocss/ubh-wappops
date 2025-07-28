// Check why notifications have undefined title/body and test notification display
// Run this in the browser console at https://vite.universalbeachhotels.com:5173

console.log('🔍 NOTIFICATION DISPLAY DEBUGGER');
console.log('==================================');

async function debugNotificationDisplay() {
    try {
        const shell = document.querySelector('ubh-shell');
        const ctx = shell?.ctx;
        
        if (!ctx?.db) {
            console.log('❌ Cannot access database');
            return;
        }
        
        console.log('📊 Analyzing recent notifications...');
        
        // Get the most recent notification
        const notifications = await ctx.db.notifications.orderBy('timestamp').reverse().limit(1).toArray();
        
        if (notifications.length === 0) {
            console.log('📭 No notifications found');
            return;
        }
        
        const notification = notifications[0];
        console.log('🔍 Latest notification details:');
        console.log('Raw notification object:', notification);
        
        // Check each property
        console.log('\n📋 Property analysis:');
        console.log('- ID:', notification.id);
        console.log('- Title:', notification.title);
        console.log('- Body:', notification.body);
        console.log('- Timestamp:', new Date(notification.timestamp).toLocaleString());
        console.log('- Channel:', notification.channel);
        console.log('- Type:', notification.type);
        console.log('- Read:', notification.read);
        console.log('- Data:', notification.data);
        
        // Try to construct what the title/body should be
        if (notification.data) {
            console.log('\n🔧 Reconstructing notification content from data:');
            const taskData = notification.data;
            
            const expectedTitle = `Tarea #${taskData.number}`;
            const expectedBody = taskData.description ? 
                taskData.description.replace(/<[^>]*>/g, '').trim() : // Remove HTML tags
                'Nueva actualización de tarea';
                
            console.log('Expected title:', expectedTitle);
            console.log('Expected body:', expectedBody);
            
            // Test showing a proper notification
            console.log('\n🧪 Testing browser notification display...');
            
            if (Notification.permission === 'granted') {
                try {
                    const testNotification = new Notification(expectedTitle, {
                        body: expectedBody,
                        icon: '/pwa-512x512.png',
                        badge: '/pwa-512x512.png',
                        tag: `task-${taskData.id}`,
                        timestamp: Date.now(),
                        requireInteraction: false,
                        silent: false
                    });
                    
                    console.log('✅ Test notification created successfully!');
                    console.log('👀 You should see a test notification now');
                    
                    // Auto-close after 5 seconds
                    setTimeout(() => {
                        testNotification.close();
                        console.log('🔕 Test notification closed');
                    }, 5000);
                    
                } catch (notificationError) {
                    console.log('❌ Error creating test notification:', notificationError);
                }
            } else {
                console.log('❌ Notification permission not granted');
            }
        }
        
        // Check if notification alert component should show count
        console.log('\n🔔 Checking notification count...');
        const unreadCount = await ctx.db.notifications.where('read').equals(false).count();
        console.log(`📬 Unread notifications: ${unreadCount}`);
        
        // Try to find and examine the notification alert component
        const shell_element = document.querySelector('ubh-shell');
        if (shell_element && shell_element.shadowRoot) {
            const alertElement = shell_element.shadowRoot.querySelector('ubh-notifications-alert');
            if (alertElement) {
                console.log('✅ Found notification alert in shadow DOM');
                console.log('Alert element:', alertElement);
            } else {
                console.log('❓ Notification alert not found in shadow DOM');
            }
        }
        
    } catch (error) {
        console.log('❌ Error debugging notifications:', error);
    }
}

// Also check service worker console for push notification logs
function checkServiceWorkerLogs() {
    console.log('\n🔧 Service Worker Info:');
    console.log('💡 To see push notification logs:');
    console.log('1. Open Chrome DevTools');
    console.log('2. Go to Application tab');
    console.log('3. Click on Service Workers');
    console.log('4. Look for console logs there');
    console.log('5. Or check the Console tab for SW messages');
}

// Run the debug
debugNotificationDisplay();
checkServiceWorkerLogs();

console.log('\n🎯 SUMMARY:');
console.log('✅ Real notifications ARE being received and stored');
console.log('❓ The issue is likely in notification display formatting');
console.log('💡 Check if you saw the test notification above');
