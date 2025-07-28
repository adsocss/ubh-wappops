// Check and subscribe to real notification channels
// This script helps verify why real notifications aren't being received
// 
// INSTRUCTIONS:
// 1. Open https://vite.universalbeachhotels.com:5173 in your browser
// 2. Make sure you're logged in to WAPPOPS
// 3. Open Developer Tools (F12) → Console tab
// 4. Copy and paste this entire script into the console
// 5. Press Enter to run it

console.log('🔍 REAL NOTIFICATION CHANNEL CHECKER');
console.log('=====================================');
console.log('📍 Make sure you\'re running this in: https://vite.universalbeachhotels.com:5173');
console.log('📍 Make sure you\'re logged in to WAPPOPS');
console.log('=====================================');

// Check current WebPush subscription status
function checkWebPushStatus() {
    console.log('\n📋 WebPush Service Status:');
    
    // Look for the ubh-shell component
    const shell = document.querySelector('ubh-shell');
    if (!shell) {
        console.log('❌ ubh-shell component not found');
        return null;
    }
    
    // Access the Wappops context from the shell
    const ctx = shell.ctx;
    if (!ctx) {
        console.log('❌ Wappops context not available');
        return null;
    }
    
    const webPush = ctx.webPush;
    if (webPush) {
        console.log('✅ WebPush service available');
        console.log('Is supported:', webPush.isSupported);
        console.log('Permission:', webPush.permission);
        console.log('Is subscribed:', webPush.isSubscribed);
        console.log('Subscription endpoint:', webPush.subscription?.endpoint?.substring(0, 50) + '...');
        
        // Store reference globally for other functions
        window._wappopsCtx = ctx;
        return webPush;
    } else {
        console.log('❌ WebPush service not available');
        return null;
    }
}

// Check server subscription info
async function checkServerSubscriptionInfo() {
    console.log('\n🔍 Checking server subscription information...');
    
    try {
        // Get auth headers
        const authHeaders = {};
        const ctx = window._wappopsCtx || document.querySelector('ubh-shell')?.ctx;
        if (ctx?.currentUser?.authorizations?.token) {
            authHeaders['Authorization'] = `Bearer ${ctx.currentUser.authorizations.token}`;
        }
        
        const response = await fetch('/api/notifications/push/debug', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Server subscription info:', result);
            
            // Check if we have subscriptions for tasks-1025-7
            if (result.subscriptions) {
                let foundRealChannel = false;
                for (const [userId, userSubs] of Object.entries(result.subscriptions)) {
                    console.log(`User ${userId}:`, userSubs);
                    for (const sub of userSubs) {
                        if (sub.channels.includes('tasks-1025-7')) {
                            console.log('✅ Found subscription to tasks-1025-7 for user', userId);
                            foundRealChannel = true;
                        }
                    }
                }
                
                if (!foundRealChannel) {
                    console.log('❌ No subscriptions found for tasks-1025-7 channel');
                    console.log('This explains why you\'re not receiving real notifications');
                }
                
                return foundRealChannel;
            }
        } else {
            console.log('❌ Failed to get debug info:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.log('❌ Error getting debug info:', error);
        return false;
    }
}

// Re-subscribe to WebPush (this will include all available channels)
async function resubscribeToWebPush() {
    console.log('\n🔔 Re-subscribing to WebPush...');
    
    try {
        const ctx = window._wappopsCtx || document.querySelector('ubh-shell')?.ctx;
        const webPush = ctx?.webPush;
        if (!webPush) {
            console.log('❌ WebPush service not available');
            return false;
        }
        
        console.log('🔄 Unsubscribing from current subscription...');
        await webPush.unsubscribe();
        
        console.log('🔄 Creating new subscription...');
        const subscription = await webPush.subscribe();
        
        if (subscription) {
            console.log('✅ Successfully re-subscribed to WebPush');
            console.log('New subscription endpoint:', subscription.endpoint.substring(0, 50) + '...');
            return true;
        } else {
            console.log('❌ Failed to create new subscription');
            return false;
        }
    } catch (error) {
        console.log('❌ Error re-subscribing:', error);
        return false;
    }
}

// Main function to run the check
async function checkRealNotifications() {
    console.log('\n🚀 Starting real notification check...');
    
    // Check WebPush status
    const webPush = checkWebPushStatus();
    if (!webPush) {
        console.log('\n❌ Cannot proceed - WebPush service not available');
        return false;
    }
    
    // Check server subscription info
    const hasRealChannelSubscription = await checkServerSubscriptionInfo();
    
    if (!hasRealChannelSubscription) {
        console.log('\n🔧 Need to re-subscribe to include tasks-1025-7 channel...');
        const resubscribed = await resubscribeToWebPush();
        
        if (resubscribed) {
            console.log('\n✅ Re-subscription complete! Checking server info again...');
            await checkServerSubscriptionInfo();
            console.log('\n✅ Setup complete! You should now receive real notifications.');
            console.log('The next time a task is updated in the PMS system, you should see it.');
        } else {
            console.log('\n❌ Could not re-subscribe. Check WebPush permissions or browser support.');
        }
    } else {
        console.log('\n✅ You are already subscribed to the real notification channel!');
        console.log('If you\'re still not receiving notifications, there may be a different issue.');
    }
    
    // Show what to expect
    console.log('\n📝 What to expect:');
    console.log('- Real notifications come from PMS task updates');
    console.log('- Channel: tasks-1025-7 (Hotel Florida Magaluf - Technical Services)');
    console.log('- Current real task: #7200 - "HAMACA LOBBY LA CUERDA ESTA EN MAL ESTADO"');
    console.log('- Task ID: 100330, Room: 102');
    
    return hasRealChannelSubscription;
}

// Run the check
checkRealNotifications().then(result => {
    console.log('\n✨ Check complete. Result:', result ? 'Already subscribed' : 'Re-subscription attempted');
});

// Export functions for manual use
window.checkRealNotifications = checkRealNotifications;
window.resubscribeToWebPush = resubscribeToWebPush;
window.checkServerSubscriptionInfo = checkServerSubscriptionInfo;
window.checkWebPushStatus = checkWebPushStatus;

console.log('\n💡 You can also run these functions manually:');
console.log('- checkRealNotifications()');
console.log('- resubscribeToWebPush()');
console.log('- checkServerSubscriptionInfo()');
console.log('- checkWebPushStatus()');
