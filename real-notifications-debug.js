// Real Notifications Debugging - Check why PMS notifications aren't being received
// Run this in browser console

async function debugRealNotifications() {
    console.log('🔍 [REAL DEBUG] Debugging real notification pipeline...');
    
    try {
        // Step 1: Get WAPPOPS context
        console.log('\n📋 Step 1: Get WAPPOPS Context & User Info');
        const shell = document.querySelector('ubh-shell');
        if (!shell || !shell.ctx) {
            throw new Error('Cannot find ubh-shell or context');
        }

        const user = shell.ctx.currentUser;
        if (!user || !user.authorizations?.token) {
            throw new Error('User not authenticated');
        }

        console.log('✅ User authenticated:', user.username);
        console.log('🔔 User ID:', user.id);
        console.log('🔔 User roles:', user.roles);
        console.log('🔔 User department:', user.department?.name, '(ID:', user.department?.id + ')');
        console.log('🔔 User centers access:', user.authorizations?.centers?.map(c => `${c.name} (${c.id})`).join(', '));

        // Step 2: Check subscription status
        console.log('\n📋 Step 2: Verify Current Subscription Status');
        const webPush = shell.ctx.webPush;
        if (!webPush || !webPush.isSubscribed) {
            throw new Error('WebPush service not subscribed - run fixSubscriptionAndTest() first');
        }
        console.log('✅ WebPush subscription active');

        // Step 3: Check notification channels
        console.log('\n📋 Step 3: Check Available Notification Channels');
        try {
            const channelsResponse = await fetch('/api/notifications/push/debug', {
                headers: { 'Authorization': `Bearer ${user.authorizations.token}` }
            });
            
            if (channelsResponse.ok) {
                const debug = await channelsResponse.json();
                console.log('🔔 Server debug info:', debug);
                
                if (debug.subscriptions && Object.keys(debug.subscriptions).length > 0) {
                    console.log('✅ User has server-side subscriptions');
                    for (const [userId, subs] of Object.entries(debug.subscriptions)) {
                        console.log(`  User ${userId}: ${subs.length} subscription(s)`);
                        subs.forEach((sub, index) => {
                            console.log(`    ${index + 1}. Channels: [${sub.channels.join(', ')}]`);
                        });
                    }
                } else {
                    console.log('❌ No server-side subscriptions found');
                }
            } else {
                console.log('❌ Could not get server debug info:', channelsResponse.status);
            }
        } catch (error) {
            console.log('❌ Error checking channels:', error.message);
        }

        // Step 4: Check recent notifications in local database
        console.log('\n📋 Step 4: Check Recent Notifications in Local Database');
        const db = shell.ctx.database;
        if (db) {
            try {
                const recentNotifications = await db.notifications.orderBy('timestamp').reverse().limit(10).toArray();
                console.log(`🔔 Found ${recentNotifications.length} recent notifications in local database:`);
                
                if (recentNotifications.length > 0) {
                    recentNotifications.forEach((notif, index) => {
                        const time = new Date(notif.timestamp).toLocaleString();
                        console.log(`  ${index + 1}. [${time}] ${notif.topic}: ${notif.description}`);
                        if (notif.data?.id) {
                            console.log(`      Task ID: ${notif.data.id}, Read: ${notif.read}`);
                        }
                    });
                } else {
                    console.log('  ❌ No notifications found in local database');
                }
            } catch (error) {
                console.log('❌ Error reading local notifications:', error.message);
            }
        } else {
            console.log('❌ Local database not available');
        }

        // Step 5: Check recent tasks in local database
        console.log('\n📋 Step 5: Check Recent Tasks in Local Database');
        if (db) {
            try {
                const recentTasks = await db.tasks.orderBy('timestamp').reverse().limit(10).toArray();
                console.log(`🔔 Found ${recentTasks.length} recent tasks in local database:`);
                
                if (recentTasks.length > 0) {
                    recentTasks.forEach((task, index) => {
                        const time = new Date(task.timestamp).toLocaleString();
                        const dept = task.department?.name || 'No dept';
                        const center = task.center?.name || 'No center';
                        console.log(`  ${index + 1}. [${time}] Task #${task.number}: ${task.description}`);
                        console.log(`      Center: ${center} (${task.center?.id}), Dept: ${dept} (${task.department?.id})`);
                        console.log(`      Status: ${task.status}, Priority: ${task.priority}`);
                    });
                } else {
                    console.log('  ❌ No tasks found in local database');
                }
            } catch (error) {
                console.log('❌ Error reading local tasks:', error.message);
            }
        }

        // Step 6: Test if we can receive new test notifications
        console.log('\n📋 Step 6: Test Current Notification Reception');
        const testTitle = `Real Debug Test ${Date.now()}`;
        const testBody = `Testing real notification pipeline at ${new Date().toLocaleTimeString()}`;
        
        console.log('🔔 Sending another test notification to verify reception...');
        
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

        if (testResponse.ok) {
            const testResult = await testResponse.json();
            console.log('✅ Test notification sent successfully:', testResult);
            
            // Wait a moment and check if it appears
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const serviceWorkerRegistration = await navigator.serviceWorker.ready;
            const notifications = await serviceWorkerRegistration.getNotifications();
            const foundTest = notifications.find(n => n.title === testTitle);
            
            if (foundTest) {
                console.log('✅ Test notification received and displayed');
            } else {
                console.log('❌ Test notification sent but not displayed');
            }
        } else {
            const errorText = await testResponse.text();
            console.log('❌ Test notification failed:', testResponse.status, errorText);
        }

        // Step 7: Provide debugging recommendations
        console.log('\n📋 Step 7: Debugging Recommendations');
        console.log('');
        console.log('🔍 To debug why real notifications aren\'t coming:');
        console.log('');
        console.log('1. 📡 Check if PMS is sending notifications:');
        console.log('   - Look at server logs for SignalR connection status');
        console.log('   - Check if tasks are being created/modified in PMS');
        console.log('   - Verify SignalR hub is sending task notifications');
        console.log('');
        console.log('2. 🔗 Check SignalR connection:');
        console.log('   - Server should show SignalR connection from PMS');
        console.log('   - Look for "🔔 REAL NOTIFICATION" messages in server logs');
        console.log('   - Check if BunGuestAPITasksNotifications is connected');
        console.log('');
        console.log('3. 🎯 Check notification channels:');
        console.log('   - Verify your user has access to the right center/department');
        console.log('   - Check if channel IDs match between PMS tasks and user access');
        console.log('   - Real notifications use format: tasks-{centerId}-{departmentId}');
        console.log('');
        console.log('4. 📱 Check client-side reception:');
        console.log('   - Monitor browser console for Service Worker messages');
        console.log('   - Look for "PUSH_NOTIFICATION_RECEIVED" messages');
        console.log('   - Check if NotificationsService.handleNotification is called');
        console.log('');
        console.log('💡 Useful commands:');
        console.log('   - monitorServiceWorkerMessages() - Monitor SW messages');
        console.log('   - checkServerLogs() - Show recent server activity');

        return {
            success: true,
            userHasSubscription: webPush.isSubscribed,
            serverSubscriptions: debug?.totalUsers || 0,
            localNotifications: recentNotifications?.length || 0,
            localTasks: recentTasks?.length || 0
        };

    } catch (error) {
        console.error('❌ Real notifications debugging failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Monitor Service Worker messages for real-time debugging
function monitorServiceWorkerMessages() {
    console.log('🔍 [SW MONITOR] Starting Service Worker message monitoring...');
    console.log('💡 Watch for push notification messages. Press Ctrl+C to stop.');
    
    let messageCount = 0;
    
    const originalConsoleLog = console.log;
    const messageHandler = (event) => {
        messageCount++;
        const timestamp = new Date().toLocaleTimeString();
        
        if (event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
            console.log(`\n🔔 [${timestamp}] REAL PUSH NOTIFICATION RECEIVED!`);
            console.log('📦 Data:', event.data);
        } else if (event.data.type === 'SW_LOG') {
            console.log(`📝 [${timestamp}] SW: ${event.data.message}`);
            if (event.data.data) {
                console.log('📦 Data:', event.data.data);
            }
        } else if (event.data.type === 'PUSH_NOTIFICATION') {
            console.log(`\n📬 [${timestamp}] NOTIFICATION PROCESSED!`);
            console.log('📦 Notification:', event.data.notification);
        } else {
            console.log(`📋 [${timestamp}] SW Message:`, event.data);
        }
    };
    
    navigator.serviceWorker.addEventListener('message', messageHandler);
    
    // Return a function to stop monitoring
    return () => {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
        console.log(`\n🛑 [SW MONITOR] Stopped monitoring. Received ${messageCount} messages.`);
    };
}

// Check if there are any tasks being created in the system
async function checkRecentTaskActivity() {
    console.log('📋 [TASK CHECK] Checking recent task activity...');
    
    try {
        const shell = document.querySelector('ubh-shell');
        const user = shell.ctx.currentUser;
        const db = shell.ctx.database;
        
        if (!db) {
            console.log('❌ Database not available');
            return;
        }
        
        // Get tasks from last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        const recentTasks = await db.tasks
            .where('timestamp')
            .above(oneHourAgo)
            .toArray();
            
        console.log(`🔔 Found ${recentTasks.length} tasks in the last hour:`);
        
        if (recentTasks.length > 0) {
            recentTasks.forEach((task, index) => {
                const time = new Date(task.timestamp).toLocaleString();
                console.log(`  ${index + 1}. [${time}] #${task.number}: ${task.description}`);
                console.log(`      Center: ${task.center?.name} (${task.center?.id})`);
                console.log(`      Department: ${task.department?.name} (${task.department?.id})`);
            });
        } else {
            console.log('  ❌ No recent task activity found');
            console.log('  💡 This might explain why no notifications are coming');
        }
        
        // Also check notifications from last hour
        const recentNotifications = await db.notifications
            .where('timestamp')
            .above(oneHourAgo)
            .toArray();
            
        console.log(`\n🔔 Found ${recentNotifications.length} notifications in the last hour:`);
        
        if (recentNotifications.length > 0) {
            recentNotifications.forEach((notif, index) => {
                const time = new Date(notif.timestamp).toLocaleString();
                console.log(`  ${index + 1}. [${time}] ${notif.topic}: ${notif.description}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error checking task activity:', error);
    }
}

// Load the functions
console.log('🔍 [REAL DEBUG] Real notifications debugging tools loaded!');
console.log('💡 Available functions:');
console.log('  - debugRealNotifications() - Complete real notification pipeline analysis');
console.log('  - monitorServiceWorkerMessages() - Real-time SW message monitoring');
console.log('  - checkRecentTaskActivity() - Check recent task/notification activity');
console.log('');
console.log('🚀 Run: debugRealNotifications() to start comprehensive debugging');
