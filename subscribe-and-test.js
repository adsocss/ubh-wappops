// Fix Web Push subscription and test notifications
// Run this in browser console

async function subscribeAndTestNotifications() {
    console.log('🔔 [SUBSCRIBE & TEST] Starting subscription and notification test...');
    
    try {
        // Step 1: Get WAPPOPS context
        console.log('\n📋 Step 1: Get WAPPOPS Context');
        const shell = document.querySelector('ubh-shell');
        if (!shell || !shell.ctx) {
            throw new Error('Cannot find ubh-shell or context');
        }

        const user = shell.ctx.currentUser;
        if (!user || !user.authorizations?.token) {
            throw new Error('User not authenticated');
        }

        console.log('✅ User authenticated:', user.username);

        // Step 2: Check current subscription status
        console.log('\n📋 Step 2: Check Web Push Subscription');
        const webPush = shell.ctx.webPush;
        if (!webPush) {
            throw new Error('WebPush service not available');
        }

        console.log('🔔 Current subscription status:', webPush.isSubscribed ? 'Subscribed' : 'Not subscribed');

        // Step 3: Subscribe if not already subscribed
        if (!webPush.isSubscribed) {
            console.log('\n📋 Step 3: Subscribe to Web Push');
            console.log('🔔 Attempting to subscribe to Web Push notifications...');
            
            try {
                await webPush.subscribe();
                console.log('✅ Successfully subscribed to Web Push notifications!');
                console.log('🔔 New subscription status:', webPush.isSubscribed ? 'Subscribed' : 'Still not subscribed');
            } catch (subscribeError) {
                console.error('❌ Failed to subscribe:', subscribeError);
                throw new Error(`Subscription failed: ${subscribeError.message}`);
            }
        } else {
            console.log('✅ Already subscribed to Web Push notifications');
        }

        // Step 4: Verify subscription worked
        console.log('\n📋 Step 4: Verify Subscription');
        if (!webPush.isSubscribed) {
            throw new Error('Subscription verification failed - still not subscribed');
        }

        // Step 5: Test notification
        console.log('\n📋 Step 5: Send Test Notification');
        const testTitle = `Subscription Test ${Date.now()}`;
        const testBody = `Testing after subscription at ${new Date().toLocaleTimeString()}`;
        
        console.log('🔔 Sending test notification with:');
        console.log('  Title:', testTitle);
        console.log('  Body:', testBody);

        const response = await fetch('/api/notifications/push/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.authorizations.token}`
            },
            body: JSON.stringify({
                channelId: 'tasks-1025-7',
                title: testTitle,
                body: testBody
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API call failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Test notification sent successfully:', result);

        // Step 6: Monitor for the notification
        console.log('\n📋 Step 6: Monitor for Browser Notification');
        console.log('⏳ Waiting for notification to appear... (up to 5 seconds)');

        let notificationFound = false;
        const startTime = Date.now();
        
        while (Date.now() - startTime < 5000 && !notificationFound) {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    if (registration.getNotifications) {
                        const notifications = await registration.getNotifications();
                        for (const notification of notifications) {
                            if (notification.title === testTitle || notification.body === testBody) {
                                console.log('\n🔔 [SUCCESS] Found our test notification!');
                                console.log('  📄 Title:', `"${notification.title}"`);
                                console.log('  📝 Body:', `"${notification.body}"`);
                                console.log('  🏷️  Tag:', notification.tag);
                                console.log('  📦 Data:', notification.data);
                                
                                if (notification.title === testTitle && notification.body === testBody) {
                                    console.log('  ✅ PERFECT! Title and body match exactly!');
                                } else {
                                    console.log('  ⚠️  Partial match - there might be some modification');
                                }
                                
                                notificationFound = true;
                                break;
                            }
                        }
                    }
                }
            }
            
            if (!notificationFound) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        if (!notificationFound) {
            console.log('❌ No matching notification found within timeout');
            
            // Show all current notifications for debugging
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    if (registration.getNotifications) {
                        const notifications = await registration.getNotifications();
                        if (notifications.length > 0) {
                            console.log('\n🔔 [DEBUG] All current notifications:');
                            notifications.forEach((notification, index) => {
                                console.log(`${index + 1}. "${notification.title}" - "${notification.body}"`);
                            });
                        } else {
                            console.log('🔔 [DEBUG] No notifications found');
                        }
                    }
                }
            }
        }

        console.log('\n✅ Subscription and test completed!');
        return {
            success: true,
            subscribed: webPush.isSubscribed,
            notificationFound,
            testTitle,
            testBody
        };

    } catch (error) {
        console.error('❌ Subscription and test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Function to check current subscription status
async function checkSubscriptionStatus() {
    console.log('🔔 [STATUS CHECK] Checking Web Push subscription status...');
    
    try {
        const shell = document.querySelector('ubh-shell');
        if (!shell?.ctx?.webPush) {
            console.log('❌ WebPush service not available');
            return;
        }

        const webPush = shell.ctx.webPush;
        console.log('🔔 Subscription status:', webPush.isSubscribed ? 'Subscribed' : 'Not subscribed');

        if (webPush.isSubscribed) {
            console.log('✅ You are subscribed to Web Push notifications');
            console.log('💡 You can now run: subscribeAndTestNotifications()');
        } else {
            console.log('❌ You are NOT subscribed to Web Push notifications');
            console.log('💡 Run: subscribeAndTestNotifications() to subscribe and test');
        }

        // Check server-side subscription info
        const user = shell.ctx.currentUser;
        if (user?.authorizations?.token) {
            try {
                const response = await fetch('/api/notifications/push/debug', {
                    headers: { 'Authorization': `Bearer ${user.authorizations.token}` }
                });
                
                if (response.ok) {
                    const debug = await response.json();
                    console.log('🔔 Server-side subscription info:', debug);
                } else {
                    console.log('❌ Could not get server-side subscription info');
                }
            } catch (error) {
                console.log('❌ Error checking server subscription:', error.message);
            }
        }

    } catch (error) {
        console.error('❌ Status check failed:', error);
    }
}

// Load the functions
console.log('🔔 [SUBSCRIBE & TEST] Subscription and test functions loaded!');
console.log('💡 Available functions:');
console.log('  - checkSubscriptionStatus() - Check current subscription status');
console.log('  - subscribeAndTestNotifications() - Subscribe and test notifications');
console.log('');
console.log('🚀 Run: checkSubscriptionStatus() first, then subscribeAndTestNotifications()');
