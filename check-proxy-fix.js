// Enhanced PWA & Mixed Content Diagnostic Script
// Run this after restarting the server with the proxy fix

async function checkMixedContentAndPWA() {
    console.log('🔍 [ENHANCED DIAGNOSTIC] Checking mixed content and PWA after proxy fix...');
    
    try {
        // Check 1: Security State Analysis
        console.log('\n📋 Step 1: Enhanced Security Analysis');
        console.log('🔒 Protocol:', window.location.protocol);
        console.log('🌐 Host:', window.location.host);
        console.log('🔗 Full URL:', window.location.href);
        console.log('🔒 Secure Context:', window.isSecureContext ? '✅ Yes' : '❌ No');
        
        // Check for mixed content warnings
        console.log('\n🔍 Mixed Content Check:');
        const hasInsecureContent = (
            document.querySelectorAll('img[src^="http:"]').length > 0 ||
            document.querySelectorAll('script[src^="http:"]').length > 0 ||
            document.querySelectorAll('link[href^="http:"]').length > 0
        );
        console.log('📦 Insecure resources detected:', hasInsecureContent ? '❌ Yes' : '✅ No');
        
        // Check 2: API Connectivity Test
        console.log('\n📋 Step 2: API Proxy Test');
        try {
            console.log('🧪 Testing API endpoint through proxy...');
            const apiResponse = await fetch('/api/status', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📡 API Response Status:', apiResponse.status);
            console.log('📡 API Response OK:', apiResponse.ok ? '✅ Yes' : '❌ No');
            
            if (apiResponse.ok) {
                const data = await apiResponse.json();
                console.log('✅ API proxy working correctly');
                console.log('📄 Response data:', data);
            } else {
                console.log('❌ API proxy issues detected');
            }
        } catch (apiError) {
            console.log('❌ API proxy error:', apiError.message);
        }
        
        // Check 3: Manifest Test
        console.log('\n📋 Step 3: Manifest Analysis');
        const manifestLinks = document.querySelectorAll('link[rel="manifest"]');
        if (manifestLinks.length > 0) {
            console.log('✅ Manifest link found:', manifestLinks[0].href);
            
            try {
                console.log('🔍 Testing manifest content...');
                const manifestResponse = await fetch(manifestLinks[0].href);
                console.log('📄 Manifest response status:', manifestResponse.status);
                console.log('📄 Manifest content type:', manifestResponse.headers.get('content-type'));
                
                const manifestText = await manifestResponse.text();
                console.log('📄 Manifest content (first 200 chars):', manifestText.substring(0, 200));
                
                // Try to parse as JSON
                try {
                    const manifest = JSON.parse(manifestText);
                    console.log('✅ Manifest parsed successfully');
                    console.log('📱 App name:', manifest.name);
                    console.log('📱 Start URL:', manifest.start_url);
                    console.log('📱 Display mode:', manifest.display);
                    console.log('📱 Icons count:', manifest.icons?.length || 0);
                } catch (parseError) {
                    console.log('❌ Manifest JSON parse error:', parseError.message);
                }
            } catch (manifestError) {
                console.log('❌ Manifest fetch error:', manifestError.message);
            }
        } else {
            console.log('❌ No manifest link found');
        }
        
        // Check 4: Service Worker Status
        console.log('\n📋 Step 4: Service Worker Analysis');
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                console.log('✅ Service Worker registered:', registration.scope);
                console.log('🔧 Service Worker state:', registration.active?.state || 'unknown');
                console.log('🔧 Service Worker URL:', registration.active?.scriptURL);
            } catch (swError) {
                console.log('❌ Service Worker error:', swError.message);
            }
        }
        
        // Check 5: Install Prompt Availability
        console.log('\n📋 Step 5: Install Prompt Check');
        let installPromptAvailable = false;
        
        // Set up listener for beforeinstallprompt
        window.addEventListener('beforeinstallprompt', (e) => {
            installPromptAvailable = true;
            console.log('🎉 beforeinstallprompt event fired - PWA is installable!');
            window.deferredPrompt = e;
            console.log('💡 Call triggerInstallPrompt() to show install dialog');
        });
        
        if (window.deferredPrompt) {
            console.log('✅ Install prompt already available');
            installPromptAvailable = true;
        } else {
            console.log('⏳ Waiting for beforeinstallprompt event...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            if (window.deferredPrompt) {
                console.log('✅ Install prompt became available');
                installPromptAvailable = true;
            } else {
                console.log('❌ No install prompt available');
            }
        }
        
        // Check 6: Browser Environment
        console.log('\n📋 Step 6: Browser Environment');
        console.log('🖥️  User Agent:', navigator.userAgent);
        console.log('📱 Screen size:', `${window.screen.width}x${window.screen.height}`);
        console.log('🖼️  Viewport size:', `${window.innerWidth}x${window.innerHeight}`);
        
        // Summary
        console.log('\n📋 FINAL DIAGNOSIS');
        const issues = [];
        
        if (!window.isSecureContext) issues.push('Not secure context');
        if (hasInsecureContent) issues.push('Mixed content detected');
        if (manifestLinks.length === 0) issues.push('No manifest link');
        if (!installPromptAvailable) issues.push('No install prompt');
        
        if (issues.length === 0) {
            console.log('🎉 SUCCESS! All PWA requirements met - should be installable!');
            console.log('💡 Try triggering install prompt: triggerInstallPrompt()');
        } else {
            console.log('❌ Issues preventing PWA installation:', issues.join(', '));
            
            if (issues.includes('Not secure context')) {
                console.log('\n🔧 SECURITY CONTEXT FIX NEEDED:');
                console.log('- Check for mixed content in DevTools Security tab');
                console.log('- Ensure all resources are served over HTTPS');
                console.log('- Verify proxy configuration is working correctly');
            }
            
            if (issues.includes('Mixed content detected')) {
                console.log('\n🔧 MIXED CONTENT FIX NEEDED:');
                console.log('- Update any http:// URLs to https://');
                console.log('- Check proxy configuration for API calls');
                console.log('- Review all external resource URLs');
            }
        }
        
        return {
            secureContext: window.isSecureContext,
            mixedContent: hasInsecureContent,
            hasManifest: manifestLinks.length > 0,
            installPromptAvailable,
            issues
        };
        
    } catch (error) {
        console.error('❌ Enhanced diagnostic failed:', error);
        return { error: error.message };
    }
}

// Load the enhanced diagnostic
console.log('🔍 [ENHANCED DIAGNOSTIC] Mixed content and PWA checker loaded!');
console.log('💡 Run: checkMixedContentAndPWA() after restarting server');
console.log('');
console.log('🔧 PROXY FIX APPLIED:');
console.log('- Changed proxy target from localhost:3000 to vite.universalbeachhotels.com:3000');
console.log('- Enabled secure: true for proper certificate validation');
console.log('- Added proper forwarding headers');
console.log('');
console.log('🚀 Next steps:');
console.log('1. Restart dev server: bun run dev');
console.log('2. Hard refresh browser: Ctrl+Shift+R');
console.log('3. Run: checkMixedContentAndPWA()');
