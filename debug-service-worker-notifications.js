// Debug Service Worker notification handling
// Run this in the browser console to see exactly what the SW receives

function debugServiceWorkerNotifications() {
    console.log('🔔 [DEBUG] Debugging Service Worker notification handling...');
    
    // Check if we can access the service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            console.log('🔧 Service Worker registrations:', registrations.length);
            
            registrations.forEach((registration, index) => {
                console.log(`SW ${index + 1}:`, registration.scope);
                console.log('  Active:', registration.active ? registration.active.scriptURL : 'None');
                console.log('  Installing:', registration.installing ? registration.installing.scriptURL : 'None');
                console.log('  Waiting:', registration.waiting ? registration.waiting.scriptURL : 'None');
            });
        });

        // Listen for messages from Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('🔔 [DEBUG] Message from Service Worker:', event.data);
        });

        console.log('🔔 [DEBUG] Service Worker message listener added');
    } else {
        console.log('❌ Service Worker not supported');
    }
}

// Function to send a test notification through the server
async function testRealNotificationFlow() {
    console.log('🔔 [DEBUG] Testing real notification flow...');
    
    try {
        // Get the shell context
        const shell = document.querySelector('ubh-shell');
        if (!shell || !shell.ctx) {
            console.error('❌ Cannot find ubh-shell or context');
            return;
        }

        const user = shell.ctx.currentUser;
        if (!user || !user.authorizations?.token) {
            console.error('❌ User not authenticated');
            return;
        }

        // Send a test notification via API
        const response = await fetch('/api/webpush/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.authorizations.token}`
            },
            body: JSON.stringify({
                channelId: 'tasks-1025-7',
                title: 'Test Notification with Specific Title',
                body: 'This is a test notification body to debug title/body display'
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Test notification sent:', result);
            console.log('🔔 [DEBUG] Check browser notification and Service Worker console');
        } else {
            console.error('❌ Test notification failed:', await response.text());
        }

    } catch (error) {
        console.error('❌ Error testing notification flow:', error);
    }
}

// Function to inspect the last received notification
function inspectLastNotification() {
    console.log('🔔 [DEBUG] Inspecting last notification...');
    
    // Check if we can get notification permission
    console.log('🔔 Notification permission:', Notification.permission);
    
    // Try to inspect any visible notifications
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
                if (registration.getNotifications) {
                    registration.getNotifications().then(notifications => {
                        console.log('🔔 [DEBUG] Active notifications:', notifications.length);
                        notifications.forEach((notification, index) => {
                            console.log(`Notification ${index + 1}:`);
                            console.log('  Title:', notification.title);
                            console.log('  Body:', notification.body);
                            console.log('  Tag:', notification.tag);
                            console.log('  Data:', notification.data);
                            console.log('  Icon:', notification.icon);
                            console.log('  Badge:', notification.badge);
                        });
                    });
                }
            });
        });
    }
}

// Run debugging functions
debugServiceWorkerNotifications();

console.log('🔔 [DEBUG] Service Worker notification debugging loaded!');
console.log('💡 Available functions:');
console.log('  - debugServiceWorkerNotifications() - Check SW status');
console.log('  - testRealNotificationFlow() - Send test notification');
console.log('  - inspectLastNotification() - Check active notifications');
