// Enhanced Web Push subscription fix and test
// Run this in browser console

async function fixSubscriptionAndTest() {
    console.log('🔧 [FIX] Starting enhanced subscription fix and test...');
    
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

        // Step 2: Check current state
        console.log('\n📋 Step 2: Check Current State');
        const webPush = shell.ctx.webPush;
        if (!webPush) {
            throw new Error('WebPush service not available');
        }

        console.log('🔔 Initial subscription status:', webPush.isSubscribed ? 'Subscribed' : 'Not subscribed');
        console.log('🔔 Browser subscription exists:', webPush.subscription ? 'Yes' : 'No');

        // Step 3: Get browser-level subscription directly
        console.log('\n📋 Step 3: Check Browser-Level Subscription');
        const serviceWorkerRegistration = await navigator.serviceWorker.ready;
        const browserSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
        
        if (browserSubscription) {
            console.log('✅ Browser has a push subscription');
            console.log('🔔 Endpoint:', browserSubscription.endpoint.substring(0, 50) + '...');
            
            // Step 4: Try to register this subscription with the server
            console.log('\n📋 Step 4: Register Existing Browser Subscription with Server');
            
            try {
                const response = await fetch('/api/notifications/push/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.authorizations.token}`
                    },
                    body: JSON.stringify({
                        subscription: browserSubscription.toJSON()
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Successfully registered existing subscription with server:', result);
                    
                    // Update the WebPush service's internal state
                    webPush._subscription = browserSubscription;
                    console.log('✅ Updated WebPush service internal state');
                } else {
                    const errorText = await response.text();
                    console.error('❌ Failed to register existing subscription:', response.status, errorText);
                    
                    // Try to create a fresh subscription
                    console.log('\n📋 Step 4b: Create Fresh Subscription');
                    await browserSubscription.unsubscribe();
                    console.log('🔄 Unsubscribed old browser subscription');
                    
                    const freshSubscription = await serviceWorkerRegistration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: webPush._urlB64ToUint8Array(webPush._vapidKey)
                    });
                    
                    console.log('🔄 Created fresh browser subscription');
                    
                    const freshResponse = await fetch('/api/notifications/push/subscribe', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user.authorizations.token}`
                        },
                        body: JSON.stringify({
                            subscription: freshSubscription.toJSON()
                        })
                    });

                    if (freshResponse.ok) {
                        const freshResult = await freshResponse.json();
                        console.log('✅ Successfully registered fresh subscription with server:', freshResult);
                        webPush._subscription = freshSubscription;
                        console.log('✅ Updated WebPush service with fresh subscription');
                    } else {
                        const freshErrorText = await freshResponse.text();
                        throw new Error(`Failed to register fresh subscription: ${freshResponse.status} - ${freshErrorText}`);
                    }
                }
            } catch (error) {
                console.error('❌ Error registering subscription:', error);
                throw error;
            }
        } else {
            console.log('❌ No browser subscription found');
            
            // Step 4: Create new subscription
            console.log('\n📋 Step 4: Create New Subscription');
            
            // Get VAPID key if not available
            if (!webPush._vapidKey) {
                console.log('🔄 Loading VAPID key...');
                await webPush._loadVapidKey();
                if (!webPush._vapidKey) {
                    throw new Error('Failed to load VAPID key');
                }
            }
            
            const newSubscription = await serviceWorkerRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: webPush._urlB64ToUint8Array(webPush._vapidKey)
            });
            
            console.log('✅ Created new browser subscription');
            
            const response = await fetch('/api/notifications/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.authorizations.token}`
                },
                body: JSON.stringify({
                    subscription: newSubscription.toJSON()
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Successfully registered new subscription with server:', result);
                webPush._subscription = newSubscription;
                console.log('✅ Updated WebPush service with new subscription');
            } else {
                const errorText = await response.text();
                throw new Error(`Failed to register new subscription: ${response.status} - ${errorText}`);
            }
        }

        // Step 5: Verify final state
        console.log('\n📋 Step 5: Verify Final Subscription State');
        console.log('🔔 WebPush service subscription status:', webPush.isSubscribed ? 'Subscribed' : 'Not subscribed');
        console.log('🔔 WebPush service has subscription object:', webPush.subscription ? 'Yes' : 'No');
        
        const finalBrowserSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
        console.log('🔔 Browser still has subscription:', finalBrowserSubscription ? 'Yes' : 'No');

        if (!webPush.isSubscribed) {
            throw new Error('Subscription process completed but isSubscribed is still false');
        }

        // Step 6: Test notification
        console.log('\n📋 Step 6: Send Test Notification');
        const testTitle = `Fixed Subscription Test ${Date.now()}`;
        const testBody = `Testing after subscription fix at ${new Date().toLocaleTimeString()}`;
        
        console.log('🔔 Sending test notification with:');
        console.log('  Title:', testTitle);
        console.log('  Body:', testBody);

        const testResponse = await fetch('/api/notifications/push/test', {
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

        if (!testResponse.ok) {
            const errorText = await testResponse.text();
            throw new Error(`Test notification failed: ${testResponse.status} - ${errorText}`);
        }

        const testResult = await testResponse.json();
        console.log('✅ Test notification sent successfully:', testResult);

        // Step 7: Monitor for the notification
        console.log('\n📋 Step 7: Monitor for Browser Notification');
        console.log('⏳ Waiting for notification to appear... (up to 10 seconds)');

        let notificationFound = false;
        const startTime = Date.now();
        
        while (Date.now() - startTime < 10000 && !notificationFound) {
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
            
            if (!notificationFound) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (!notificationFound) {
            console.log('❌ No matching notification found within timeout');
            
            // Show all current notifications for debugging
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

        console.log('\n✅ Subscription fix and test completed successfully!');
        return {
            success: true,
            subscribed: webPush.isSubscribed,
            notificationFound,
            testTitle,
            testBody
        };

    } catch (error) {
        console.error('❌ Subscription fix and test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Function to check subscription status with enhanced details
async function checkDetailedSubscriptionStatus() {
    console.log('🔍 [DETAILED CHECK] Checking detailed subscription status...');
    
    try {
        const shell = document.querySelector('ubh-shell');
        if (!shell?.ctx?.webPush) {
            console.log('❌ WebPush service not available');
            return;
        }

        const webPush = shell.ctx.webPush;
        const user = shell.ctx.currentUser;

        console.log('🔔 WebPush Service Status:');
        console.log('  - isSubscribed:', webPush.isSubscribed);
        console.log('  - subscription object:', webPush.subscription ? 'exists' : 'null');
        console.log('  - VAPID key loaded:', webPush._vapidKey ? 'yes' : 'no');
        console.log('  - is initialized:', webPush._isInitialized);

        // Check browser-level subscription
        if ('serviceWorker' in navigator) {
            const serviceWorkerRegistration = await navigator.serviceWorker.ready;
            const browserSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
            
            console.log('🔔 Browser-Level Subscription:');
            console.log('  - exists:', browserSubscription ? 'yes' : 'no');
            if (browserSubscription) {
                console.log('  - endpoint:', browserSubscription.endpoint.substring(0, 50) + '...');
            }
        }

        // Check server-side subscription info
        if (user?.authorizations?.token) {
            try {
                const response = await fetch('/api/notifications/push/debug', {
                    headers: { 'Authorization': `Bearer ${user.authorizations.token}` }
                });
                
                if (response.ok) {
                    const debug = await response.json();
                    console.log('🔔 Server-Side Subscription Info:', debug);
                } else {
                    console.log('❌ Could not get server-side subscription info:', response.status);
                }
            } catch (error) {
                console.log('❌ Error checking server subscription:', error.message);
            }
        }

        console.log('\n💡 Run: fixSubscriptionAndTest() to fix and test the subscription');

    } catch (error) {
        console.error('❌ Detailed status check failed:', error);
    }
}

// Load the functions
console.log('🔧 [FIX] Enhanced subscription fix functions loaded!');
console.log('💡 Available functions:');
console.log('  - checkDetailedSubscriptionStatus() - Detailed subscription analysis');
console.log('  - fixSubscriptionAndTest() - Fix subscription and test notifications');
console.log('');
console.log('🚀 Run: checkDetailedSubscriptionStatus() first, then fixSubscriptionAndTest()');
