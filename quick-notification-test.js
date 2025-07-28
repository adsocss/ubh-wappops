// Quick test to verify notification display
// Run this in browser console

async function quickNotificationTest() {
    console.log('🔔 [QUICK TEST] Starting quick notification test...');
    
    try {
        // Get context
        const shell = document.querySelector('ubh-shell');
        if (!shell?.ctx?.currentUser?.authorizations?.token) {
            console.error('❌ User not authenticated');
            return;
        }

        const token = shell.ctx.currentUser.authorizations.token;
        
        // Send test notification with very specific title/body
        const testTitle = `TITLE TEST: ${new Date().toLocaleTimeString()}`;
        const testBody = `BODY TEST: This should appear as the notification body - ${Date.now()}`;
        
        console.log('🔔 Sending notification:');
        console.log('  Expected Title:', testTitle);
        console.log('  Expected Body:', testBody);

        // Try different API endpoints
        const possibleEndpoints = [
            '/api/notifications/push/test',  // Correct endpoint via Vite proxy
            'https://localhost:3000/api/notifications/push/test',  // Direct backend
            `${window.location.origin}/api/notifications/push/test`  // Same origin
        ];

        let response = null;
        for (const endpoint of possibleEndpoints) {
            try {
                console.log(`🔔 Trying: ${endpoint}`);
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        channelId: 'tasks-1025-7',
                        title: testTitle,
                        body: testBody
                    })
                });

                if (response.ok) {
                    console.log(`✅ Connected to: ${endpoint}`);
                    break;
                } else {
                    console.log(`❌ ${endpoint}: ${response.status}`);
                }
            } catch (error) {
                console.log(`❌ ${endpoint} failed:`, error.message);
            }
        }

        if (response.ok) {
            console.log('✅ Notification sent! Check your browser notification.');
            console.log('💡 Look for a notification with the title and body above.');
            
            // Check active notifications after a short delay
            setTimeout(async () => {
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        if (registration.getNotifications) {
                            const notifications = await registration.getNotifications();
                            console.log('\n🔔 [VERIFICATION] Active notifications:');
                            notifications.forEach((notification, index) => {
                                console.log(`${index + 1}. "${notification.title}" - "${notification.body}"`);
                                
                                if (notification.title === testTitle && notification.body === testBody) {
                                    console.log('   ✅ PERFECT! Title and body match exactly!');
                                } else if (notification.title.includes('TITLE TEST') || notification.body.includes('BODY TEST')) {
                                    console.log('   ⚠️  Partial match - check for differences');
                                } else {
                                    console.log('   ℹ️  Different notification');
                                }
                            });
                        }
                    }
                }
            }, 2000);
            
        } else {
            console.error('❌ Failed to send notification:', await response.text());
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

console.log('🔔 [QUICK TEST] Quick notification test loaded!');
console.log('🚀 Run: quickNotificationTest()');
