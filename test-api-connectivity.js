// Simple API connectivity test
// Run this in browser console first

async function testAPIConnectivity() {
    console.log('🔧 [API TEST] Testing API connectivity...');
    
    try {
        // Get authentication
        const shell = document.querySelector('ubh-shell');
        if (!shell?.ctx?.currentUser?.authorizations?.token) {
            console.error('❌ User not authenticated');
            return false;
        }

        const token = shell.ctx.currentUser.authorizations.token;
        console.log('✅ Authentication token available');

        // Test different endpoints
        const endpoints = [
            '/api/notifications/push/vapid-key',  // Should work if server is running
            '/api/notifications/push/debug',  // Should work if authenticated  
            '/api/notifications/push/test'  // Our test endpoint
        ];

        for (const endpoint of endpoints) {
            console.log(`\n🔧 Testing ${endpoint}:`);
            
            try {
                // For test endpoint, use POST with body
                const isTestEndpoint = endpoint.includes('/test');
                const response = await fetch(endpoint, {
                    method: isTestEndpoint ? 'POST' : 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: isTestEndpoint ? JSON.stringify({
                        channelId: 'tasks-1025-7',
                        title: 'Connectivity Test',
                        body: 'Testing API connection'
                    }) : undefined
                });

                console.log(`  Status: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`  ✅ Success:`, result);
                } else {
                    const error = await response.text();
                    console.log(`  ❌ Error: ${error}`);
                }
                
            } catch (error) {
                console.log(`  ❌ Network error:`, error.message);
            }
        }

        return true;
        
    } catch (error) {
        console.error('❌ API test failed:', error);
        return false;
    }
}

// Check current location and suggest correct endpoint
function checkCurrentEnvironment() {
    console.log('🔧 [ENV CHECK] Current environment:');
    console.log('  Current URL:', window.location.href);
    console.log('  Origin:', window.location.origin);
    console.log('  Protocol:', window.location.protocol);
    console.log('  Host:', window.location.host);
    console.log('  Port:', window.location.port);
    
    // Suggest correct API base URL
    if (window.location.port === '5174') {
        console.log('💡 You\'re on Vite dev server port 5174');
        console.log('💡 API proxy should work with /api/ prefix');
    } else if (window.location.port === '5173') {
        console.log('💡 You\'re on Vite dev server port 5173');
        console.log('💡 API proxy should work with /api/ prefix');
    } else {
        console.log('💡 You might be on production - API should be same origin');
    }
}

checkCurrentEnvironment();
console.log('🔧 [API TEST] API connectivity test loaded!');
console.log('🚀 Run: testAPIConnectivity()');
