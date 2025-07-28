// Check recent notifications in the WAPPOPS app
// Run this in the browser console at https://vite.universalbeachhotels.com:5173

console.log('🔍 CHECKING RECENT NOTIFICATIONS');
console.log('==================================');

async function checkRecentNotifications() {
    try {
        const shell = document.querySelector('ubh-shell');
        const ctx = shell?.ctx;
        
        if (!ctx) {
            console.log('❌ Cannot access WAPPOPS context');
            return;
        }
        
        console.log('📊 Checking notification database...');
        
        // Access the notifications service
        const notificationsService = ctx.notifications;
        if (!notificationsService) {
            console.log('❌ Notifications service not available');
            return;
        }
        
        // Try to access the database directly
        const db = ctx.db;
        if (!db) {
            console.log('❌ Database not available');
            return;
        }
        
        console.log('✅ Database available, checking notifications table...');
        
        // Check if there are any notifications in the database
        try {
            const notifications = await db.notifications.orderBy('timestamp').reverse().limit(10).toArray();
            console.log(`📬 Found ${notifications.length} recent notifications:`);
            
            if (notifications.length > 0) {
                notifications.forEach((notification, index) => {
                    console.log(`${index + 1}. [${new Date(notification.timestamp).toLocaleString()}] ${notification.title}`);
                    console.log(`   📝 ${notification.body}`);
                    console.log(`   📊 Channel: ${notification.channel || 'Unknown'}`);
                    console.log(`   🔗 Data:`, notification.data);
                    console.log('');
                });
            } else {
                console.log('📭 No notifications found in local database');
                console.log('💡 This could mean:');
                console.log('   - No real notifications have been sent recently');
                console.log('   - Notifications were received but not stored locally');
                console.log('   - Database table doesn\'t exist yet');
            }
            
        } catch (dbError) {
            console.log('❌ Error accessing notifications table:', dbError);
            console.log('💡 The notifications table might not exist yet');
        }
        
        // Check browser's notification history (if possible)
        console.log('\n🌐 Browser notification permission:', Notification.permission);
        
        // Check if there are any service worker registrations
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            console.log(`🔧 Service Worker registrations: ${registrations.length}`);
            
            // Check for any stored notifications in service worker
            registrations.forEach((reg, index) => {
                console.log(`SW ${index + 1}: ${reg.scope}`);
            });
        }
        
    } catch (error) {
        console.log('❌ Error checking notifications:', error);
    }
}

// Also check current notification alert state
function checkNotificationAlert() {
    console.log('\n🔔 Checking notification alert component...');
    
    const notificationAlert = document.querySelector('ubh-notifications-alert');
    if (notificationAlert) {
        console.log('✅ Notification alert component found');
        // Try to see if there's a count or state
        console.log('Alert element:', notificationAlert);
    } else {
        console.log('❌ Notification alert component not found');
    }
}

// Run the checks
checkRecentNotifications();
checkNotificationAlert();

console.log('\n💡 If no recent notifications are found, try:');
console.log('1. Wait for a real PMS task update to occur');
console.log('2. Ask someone to update task #7200 in the PMS system');
console.log('3. Check that the PMS system is connected and sending updates');
