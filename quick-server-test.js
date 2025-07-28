// Quick test to check server status and restart instructions
console.log('🔧 [QUICK TEST] Checking current status...');

// Check if servers are running
console.log('\n📋 Server Status Check:');
console.log('🌐 Frontend URL:', window.location.href);

// Test if backend is running
async function quickServerTest() {
    try {
        // Test backend directly (before proxy)
        console.log('\n🧪 Testing backend server directly...');
        const directTest = await fetch('https://vite.universalbeachhotels.com:3000/api/status');
        console.log('📡 Direct backend status:', directTest.status);
        console.log('📡 Direct backend OK:', directTest.ok ? '✅' : '❌');
    } catch (error) {
        console.log('❌ Backend server not accessible:', error.message);
        console.log('💡 Backend might not be running on vite.universalbeachhotels.com:3000');
    }
    
    // Check what manifest URL VitePWA should use
    console.log('\n📋 Manifest Auto-Detection:');
    const manifestLinks = document.querySelectorAll('link[rel="manifest"]');
    console.log('🔍 Manifest links found:', manifestLinks.length);
    
    if (manifestLinks.length === 0) {
        console.log('⚠️  No manifest link found - VitePWA should inject one automatically');
        console.log('💡 This suggests VitePWA plugin might not be working correctly');
    } else {
        manifestLinks.forEach((link, index) => {
            console.log(`📄 Manifest ${index + 1}:`, link.href);
        });
    }
    
    // Check for VitePWA generated files
    console.log('\n📋 VitePWA Files Check:');
    const testUrls = [
        '/manifest.webmanifest',
        '/sw.js',
        '/workbox-*.js'
    ];
    
    for (const url of testUrls) {
        try {
            const response = await fetch(url);
            console.log(`📄 ${url}:`, response.status, response.headers.get('content-type'));
        } catch (error) {
            console.log(`❌ ${url}: Failed to fetch`);
        }
    }
}

quickServerTest();

console.log('\n🚀 NEXT ACTIONS:');
console.log('1. Ensure both servers are running:');
console.log('   - Frontend: https://vite.universalbeachhotels.com:5173');
console.log('   - Backend: https://vite.universalbeachhotels.com:3000');
console.log('');
console.log('2. Restart development servers:');
console.log('   bun run dev');
console.log('');
console.log('3. Hard refresh browser:');
console.log('   Ctrl+Shift+R');
console.log('');
console.log('4. Check Application tab in DevTools:');
console.log('   - Manifest section should show valid JSON');
console.log('   - Service Workers should be active');
console.log('');
console.log('💡 The VitePWA plugin should automatically inject the manifest link and generate the proper files!');
