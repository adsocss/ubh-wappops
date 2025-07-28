// Verification script to test the optimized notification system
async function verifyOptimization() {
    try {
        console.log('🔍 Verifying notification system optimization...');
        
        // Get the WAPPOPS app shell
        const shell = document.querySelector('ubh-shell');
        if (!shell) {
            throw new Error('WAPPOPS shell not found');
        }
        
        const token = shell.getJWTToken();
        if (!token) {
            throw new Error('No JWT token available');
        }
        
        console.log('✅ JWT token obtained');
        
        // Test API endpoint
        console.log('🧪 Testing optimized notification delivery...');
        
        const response = await fetch('/api/notifications/push/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Optimization Test',
                body: 'Testing optimized payload size for FCM compliance',
                icon: '/pwa-512x512.png'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Test notification sent successfully:', result);
            console.log('🎉 Notification system is working with optimized payloads!');
            
            // Check subscription status
            const webPushService = shell.app?.services?.webPush;
            if (webPushService) {
                console.log('📱 Subscription status:', webPushService.isSubscribed ? 'Active' : 'Inactive');
            }
            
            return { success: true, message: 'Optimization verified successfully' };
        } else {
            const error = await response.text();
            console.error('❌ Test failed:', error);
            return { success: false, error };
        }
        
    } catch (error) {
        console.error('❌ Verification failed:', error);
        return { success: false, error: error.message };
    }
}

// Execute the verification
verifyOptimization().then(result => {
    console.log('\n🔍 VERIFICATION RESULT:', result);
});
