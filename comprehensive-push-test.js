// Comprehensive push notification test
// Run this in the browser console to test the complete flow

async function comprehensivePushNotificationTest() {
    console.log('🔔 [COMPREHENSIVE TEST] Starting complete push notification test...');
    
    try {
        // Step 1: Check basic setup
        console.log('\n📋 Step 1: Basic Setup Check');
        console.log('🔔 Notification permission:', Notification.permission);
        console.log('🔔 Service Worker support:', 'serviceWorker' in navigator);
        console.log('🔔 Push Manager support:', 'PushManager' in window);

        // Step 2: Get WAPPOPS context
        console.log('\n📋 Step 2: WAPPOPS Context');
        const shell = document.querySelector('ubh-shell');
        if (!shell || !shell.ctx) {
            throw new Error('Cannot find ubh-shell or context');
        }

        const user = shell.ctx.currentUser;
        if (!user || !user.authorizations?.token) {
            throw new Error('User not authenticated');
        }

        console.log('✅ User authenticated:', user.username);
        console.log('✅ Token available:', user.authorizations.token ? 'Yes' : 'No');

        // Step 3: Check Web Push subscription
        console.log('\n📋 Step 3: Web Push Subscription');
        const webPush = shell.ctx.webPush;
        if (!webPush) {
            throw new Error('WebPush service not available');
        }

        console.log('✅ WebPush service available');
        console.log('🔔 Subscription status:', webPush.isSubscribed ? 'Subscribed' : 'Not subscribed');

        // Step 4: Clear any existing notifications
        console.log('\n📋 Step 4: Clear existing notifications');
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                if (registration.getNotifications) {
                    const notifications = await registration.getNotifications();
                    console.log(`🔔 Found ${notifications.length} existing notifications`);
                    notifications.forEach(n => n.close());
                    console.log('✅ Cleared existing notifications');
                }
            }
        }

        // Step 5: Add Service Worker message listener
        console.log('\n📋 Step 5: Setup Service Worker monitoring');
        const messagePromise = new Promise((resolve) => {
            const messageHandler = (event) => {
                console.log('🔔 [SW MESSAGE] Received from Service Worker:', event.data);
                if (event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
                    resolve(event.data);
                    navigator.serviceWorker.removeEventListener('message', messageHandler);
                }
            };
            navigator.serviceWorker.addEventListener('message', messageHandler);
            
            // Remove listener after 10 seconds to avoid memory leaks
            setTimeout(() => {
                navigator.serviceWorker.removeEventListener('message', messageHandler);
                resolve(null);
            }, 10000);
        });

        // Step 6: Send test notification
        console.log('\n📋 Step 6: Send test notification');
        const testTitle = `Test ${Date.now()}`;
        const testBody = `Push notification test at ${new Date().toLocaleTimeString()}`;
        
        console.log('🔔 Sending notification with:');
        console.log('  Title:', testTitle);
        console.log('  Body:', testBody);

        // Try different API endpoints based on environment
        const possibleEndpoints = [
            '/api/notifications/push/test',  // Correct endpoint via Vite proxy
            'https://localhost:3000/api/notifications/push/test',  // Direct backend
            `${window.location.origin}/api/notifications/push/test`  // Same origin
        ];

        let response = null;
        let lastError = null;

        for (const endpoint of possibleEndpoints) {
            try {
                console.log(`🔔 Trying endpoint: ${endpoint}`);
                
                response = await fetch(endpoint, {
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

                if (response.ok) {
                    console.log(`✅ Successfully connected to: ${endpoint}`);
                    break;
                } else {
                    console.log(`❌ ${endpoint} returned: ${response.status} ${response.statusText}`);
                    const errorText = await response.text();
                    console.log(`   Response: ${errorText}`);
                    lastError = `${response.status}: ${errorText}`;
                }
            } catch (error) {
                console.log(`❌ ${endpoint} failed with error:`, error.message);
                lastError = error.message;
            }
        }

        if (!response || !response.ok) {
            throw new Error(`All API endpoints failed. Last error: ${lastError}`);
        }

        const result = await response.json();
        console.log('✅ Test notification sent:', result);

        // Step 7: Wait for notification and Service Worker response
        console.log('\n📋 Step 7: Monitor notification display');
        console.log('⏳ Waiting for push notification... (up to 10 seconds)');

        // Monitor for browser notification
        const notificationCheckInterval = setInterval(async () => {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    if (registration.getNotifications) {
                        const notifications = await registration.getNotifications();
                        if (notifications.length > 0) {
                            console.log('\n🔔 [BROWSER NOTIFICATIONS] Found active notifications:');
                            notifications.forEach((notification, index) => {
                                console.log(`Notification ${index + 1}:`);
                                console.log('  📄 Title:', notification.title);
                                console.log('  📝 Body:', notification.body);
                                console.log('  🏷️  Tag:', notification.tag);
                                console.log('  📦 Data:', notification.data);
                                
                                // Check if this matches our test
                                if (notification.title === testTitle || notification.body === testBody) {
                                    console.log('  ✅ This matches our test notification!');
                                } else if (notification.title === 'undefined' || notification.body === 'undefined') {
                                    console.log('  ❌ This notification has undefined title/body!');
                                } else {
                                    console.log('  ℹ️  This is a different notification');
                                }
                            });
                        }
                    }
                }
            }
        }, 1000);

        // Wait for Service Worker message
        const swMessage = await messagePromise;
        clearInterval(notificationCheckInterval);

        // Step 8: Analyze results
        console.log('\n📋 Step 8: Test Results Analysis');
        if (swMessage) {
            console.log('✅ Service Worker message received:', swMessage);
            
            const originalNotification = swMessage.notification;
            if (originalNotification) {
                console.log('🔔 Original notification data:');
                console.log('  ID:', originalNotification.id);
                console.log('  Topic:', originalNotification.topic);
                console.log('  Description:', originalNotification.description);
                console.log('  Channel:', originalNotification.channel?.id);
                console.log('  Data:', originalNotification.data);
            }
        } else {
            console.log('❌ No Service Worker message received within timeout');
        }

        // Final check on active notifications
        console.log('\n📋 Final: Active notifications check');
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                if (registration.getNotifications) {
                    const notifications = await registration.getNotifications();
                    console.log(`🔔 Final count: ${notifications.length} active notifications`);
                    
                    if (notifications.length > 0) {
                        notifications.forEach((notification, index) => {
                            console.log(`Final Notification ${index + 1}:`);
                            console.log('  Title:', `"${notification.title}"`);
                            console.log('  Body:', `"${notification.body}"`);
                            console.log('  Is title our test?', notification.title === testTitle);
                            console.log('  Is body our test?', notification.body === testBody);
                        });
                    }
                }
            }
        }

        console.log('\n✅ Comprehensive test completed!');
        return {
            success: true,
            testTitle,
            testBody,
            swMessage
        };

    } catch (error) {
        console.error('❌ Comprehensive test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Function to test a real PMS notification
async function waitForRealPMSNotification() {
    console.log('🔔 [REAL PMS] Waiting for real PMS notification...');
    console.log('💡 Trigger a task update in the PMS system now...');
    
    // Monitor for the next 30 seconds
    const startTime = Date.now();
    const timeout = 30000; // 30 seconds
    
    const monitorInterval = setInterval(async () => {
        const elapsed = Date.now() - startTime;
        if (elapsed > timeout) {
            clearInterval(monitorInterval);
            console.log('⏰ Timeout reached - no real notification received');
            return;
        }
        
        // Check for new notifications
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                if (registration.getNotifications) {
                    const notifications = await registration.getNotifications();
                    notifications.forEach((notification, index) => {
                        // Look for task notifications that aren't our test
                        if (notification.tag && notification.tag.startsWith('task-') && 
                            !notification.title.includes('Test')) {
                            
                            console.log('\n🔔 [REAL PMS] Found real PMS notification:');
                            console.log('  Title:', `"${notification.title}"`);
                            console.log('  Body:', `"${notification.body}"`);
                            console.log('  Tag:', notification.tag);
                            console.log('  Data:', notification.data);
                            
                            if (notification.title === 'undefined' || notification.body === 'undefined') {
                                console.log('  ❌ ISSUE CONFIRMED: Real notification has undefined title/body!');
                            } else {
                                console.log('  ✅ Real notification has proper title/body');
                            }
                            
                            clearInterval(monitorInterval);
                        }
                    });
                }
            }
        }
        
        console.log(`⏳ Still waiting... (${Math.round((timeout - elapsed) / 1000)}s remaining)`);
    }, 2000);
}

// Load the comprehensive test
console.log('🔔 [COMPREHENSIVE TEST] Test functions loaded!');
console.log('💡 Available functions:');
console.log('  - comprehensivePushNotificationTest() - Complete push notification test');
console.log('  - waitForRealPMSNotification() - Monitor for real PMS notifications');
console.log('');
console.log('🚀 Run comprehensivePushNotificationTest() to start testing!');
