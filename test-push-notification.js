// Test script to send push notification from browser console
// Copy and paste this into the browser console when logged into the WAPPOPS app

// Get the current user's JWT token from the WAPPOPS context
function getAuthHeaders() {
    try {
        // Try to get the token from the WAPPOPS app context
        const wappopsShell = document.querySelector('ubh-shell');
        const token = wappopsShell?.ctx?.api?._token;
        
        if (token) {
            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
        } else {
            console.warn('⚠️ No JWT token found - API calls may fail');
            return {
                'Content-Type': 'application/json'
            };
        }
    } catch (error) {
        console.warn('⚠️ Could not get JWT token:', error);
        return {
            'Content-Type': 'application/json'
        };
    }
}

async function testPushNotification() {
    try {
        console.log('🔔 Testing push notification...');
        
        const headers = getAuthHeaders();
        console.log('🔔 Using headers:', Object.keys(headers));
        
        const response = await fetch('/api/notifications/push/test', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                title: 'Test from Browser Console',
                body: 'This is a test notification sent from the browser console',
                channelId: 'tasks-1025-2'
            })
        });
        
        const result = await response.json();
        console.log('🔔 Test notification result:', result);
        
        if (result.success) {
            console.log('✅ Test notification sent successfully!');
            console.log('   Channel:', result.channelId);
            console.log('   Title:', result.title);
            console.log('   Body:', result.body);
            console.log('   User has access to', result.userChannels, 'channels');
        } else {
            console.error('❌ Test notification failed:', result.error);
            if (result.availableChannels) {
                console.log('   Available channels:', result.availableChannels);
            }
        }
        
    } catch (error) {
        console.error('❌ Error testing push notification:', error);
    }
}

// Also test debug endpoint
async function checkPushSubscriptions() {
    try {
        console.log('🔔 Checking push subscriptions...');
        
        const headers = getAuthHeaders();
        const response = await fetch('/api/notifications/push/debug', {
            headers: headers
        });
        
        // Check response status first
        const contentType = response.headers.get('content-type');
        console.log('🔔 Response status:', response.status);
        console.log('🔔 Content-Type:', contentType);
        
        if (response.status !== 200) {
            console.error('❌ Server returned error status:', response.status);
            const text = await response.text();
            console.log('   Response body:', text.substring(0, 300));
            return;
        }
        
        let result;
        try {
            result = await response.json();
        } catch (jsonError) {
            console.error('❌ Failed to parse response as JSON:', jsonError);
            const text = await response.text();
            console.log('   Raw response:', text.substring(0, 300));
            return;
        }
        
        console.log('🔔 Push subscriptions debug info:', result);
        console.log('   Total users with subscriptions:', result.totalUsers);
        
        if (result.totalUsers > 0) {
            console.log('✅ User subscriptions found');
            Object.keys(result.subscriptions).forEach(userId => {
                const userSubs = result.subscriptions[userId];
                console.log(`   User ${userId}: ${userSubs.length} subscription(s)`);
                userSubs.forEach((sub, index) => {
                    console.log(`     Subscription ${index + 1}:`);
                    console.log(`       Endpoint: ${sub.endpoint}`);
                    console.log(`       Channels: ${sub.channels.length} (${sub.channels.slice(0, 5).join(', ')}${sub.channels.length > 5 ? '...' : ''})`);
                    console.log(`       Timestamp: ${sub.timestamp}`);
                });
            });
        } else {
            console.log('⚠️ No push subscriptions found');
            console.log('   This could mean:');
            console.log('   1. You need to refresh/login again to trigger push subscription');
            console.log('   2. Push notifications are not enabled in your browser');
            console.log('   3. The WebPush service failed to initialize');
        }
        
    } catch (error) {
        console.error('❌ Error checking push subscriptions:', error);
    }
}

console.log('🔔 Push notification test functions loaded!');
console.log('📖 Instructions:');
console.log('   1. Make sure you are logged into WAPPOPS');
console.log('   2. Run: await checkLoginStatus()');
console.log('   3. Run: await checkPushSubscriptions()');
console.log('   4. Run: await testPushNotification()');
console.log('   5. Check if you receive the push notification');
console.log('');
console.log('💡 If login check fails but you know you are logged in:');
console.log('   Skip to: await checkPushSubscriptions()');
console.log('   And: await testPushNotification()');

// Check if user is logged in
async function checkLoginStatus() {
    try {
        console.log('🔔 Checking login status...');
        
        const headers = getAuthHeaders();
        const response = await fetch('/api/login/validate', {
            headers: headers
        });
        const contentType = response.headers.get('content-type');
        
        console.log('🔔 Login check - Status:', response.status);
        console.log('🔔 Login check - Content-Type:', contentType);
        
        if (response.status === 200) {
            try {
                const user = await response.json();
                console.log('✅ User is logged in:', user.username);
                console.log('   User ID:', user.id);
                console.log('   User roles:', user.roles?.slice(0, 5).join(', ') + (user.roles?.length > 5 ? '...' : ''));
                console.log('   User department:', user.department?.name || 'None');
                console.log('   JWT Token present:', !!headers.Authorization);
                console.log('   Is Admin:', user.isAdmin);
                console.log('   Has WAPPOPS access:', user.roles?.includes('wappops'));
                return true;
            } catch (jsonError) {
                console.error('❌ Failed to parse response as JSON:', jsonError);
                const text = await response.text();
                console.log('   Raw response:', text.substring(0, 500));
                return false;
            }
        } else {
            console.error('❌ Login validation failed');
            console.log('   Status:', response.status);
            console.log('   Headers:', [...response.headers.entries()]);
            
            // Try to read the response to see what we got
            try {
                const text = await response.text();
                console.log('   Response body preview:', text.substring(0, 300));
            } catch (e) {
                console.log('   Could not read response body');
            }
            
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error checking login status:', error);
        return false;
    }
}
