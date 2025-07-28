// PWA Installability Diagnostic Script
// Run this in the browser console to check why PWA isn't installable on desktop

async function checkPWAInstallability() {
    console.log('🔍 [PWA DIAGNOSTIC] Checking PWA installability requirements...');
    
    try {
        // Check 1: HTTPS Status
        console.log('\n📋 Step 1: Security Status');
        console.log('🔒 Protocol:', window.location.protocol);
        console.log('🌐 Host:', window.location.host);
        console.log('🔗 Full URL:', window.location.href);
        
        // Check if connection is secure
        if (window.location.protocol !== 'https:') {
            console.log('❌ NOT HTTPS - PWA requires HTTPS for desktop installation');
        } else {
            console.log('✅ HTTPS protocol detected');
        }
        
        // Check 2: Service Worker
        console.log('\n📋 Step 2: Service Worker Status');
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                console.log('✅ Service Worker registered:', registration.scope);
                console.log('🔧 Service Worker state:', registration.active?.state || 'unknown');
            } catch (error) {
                console.log('❌ Service Worker error:', error.message);
            }
        } else {
            console.log('❌ Service Worker not supported');
        }
        
        // Check 3: Web App Manifest
        console.log('\n📋 Step 3: Web App Manifest');
        const manifestLinks = document.querySelectorAll('link[rel="manifest"]');
        if (manifestLinks.length > 0) {
            console.log('✅ Manifest link found:', manifestLinks[0].href);
            
            try {
                const manifestResponse = await fetch(manifestLinks[0].href);
                const manifest = await manifestResponse.json();
                console.log('✅ Manifest loaded successfully');
                console.log('📄 Manifest name:', manifest.name);
                console.log('📄 Manifest start_url:', manifest.start_url);
                console.log('📄 Manifest display:', manifest.display);
                
                // Check required manifest fields
                const requiredFields = ['name', 'start_url', 'display', 'icons'];
                const missingFields = requiredFields.filter(field => !manifest[field]);
                if (missingFields.length > 0) {
                    console.log('❌ Missing required manifest fields:', missingFields);
                } else {
                    console.log('✅ All required manifest fields present');
                }
                
                // Check icons
                if (manifest.icons && manifest.icons.length > 0) {
                    console.log('✅ Icons defined in manifest:', manifest.icons.length);
                    const has192 = manifest.icons.some(icon => icon.sizes.includes('192'));
                    const has512 = manifest.icons.some(icon => icon.sizes.includes('512'));
                    console.log('📱 Has 192x192 icon:', has192 ? '✅' : '❌');
                    console.log('📱 Has 512x512 icon:', has512 ? '✅' : '❌');
                } else {
                    console.log('❌ No icons defined in manifest');
                }
            } catch (error) {
                console.log('❌ Failed to load manifest:', error.message);
            }
        } else {
            console.log('❌ No manifest link found in HTML');
        }
        
        // Check 4: Certificate Status (Security State)
        console.log('\n📋 Step 4: Certificate/Security Analysis');
        
        // Check if we can access secure context APIs
        const isSecureContext = window.isSecureContext;
        console.log('🔒 Secure Context:', isSecureContext ? '✅ Yes' : '❌ No');
        
        if (!isSecureContext) {
            console.log('❌ CRITICAL: Not in secure context - this prevents PWA installation');
        }
        
        // Check 5: BeforeInstallPrompt Event
        console.log('\n📋 Step 5: Install Prompt Availability');
        
        // Listen for beforeinstallprompt event
        let installPromptAvailable = false;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            installPromptAvailable = true;
            console.log('✅ beforeinstallprompt event fired - PWA is installable!');
            
            // Store the event for manual triggering
            window.deferredPrompt = e;
            console.log('💡 You can now call: triggerInstallPrompt() to show install dialog');
        });
        
        // Check current state
        if (window.deferredPrompt) {
            console.log('✅ Install prompt already available');
            installPromptAvailable = true;
        } else {
            console.log('⏳ Waiting for beforeinstallprompt event...');
            // Wait a moment to see if the event fires
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (window.deferredPrompt) {
                console.log('✅ Install prompt became available');
                installPromptAvailable = true;
            } else {
                console.log('❌ No install prompt available - PWA criteria not met');
            }
        }
        
        // Check 6: Desktop-specific requirements
        console.log('\n📋 Step 6: Browser Environment Analysis');
        console.log('🖥️  User Agent:', navigator.userAgent);
        
        const isDesktop = !(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        console.log('🖥️  Desktop browser (by UA):', isDesktop ? '✅ Yes' : '❌ No');
        
        // Additional desktop detection
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        console.log('📱 Screen size:', `${screenWidth}x${screenHeight}`);
        console.log('🖼️  Viewport size:', `${viewportWidth}x${viewportHeight}`);
        console.log('🔍 Device pixel ratio:', window.devicePixelRatio);
        
        // Check if Chrome DevTools mobile simulation is active
        const isLikelyMobileSimulation = (
            navigator.userAgent.includes('Mobile') && 
            (screenWidth > 1200 || screenHeight > 800)
        );
        
        if (isLikelyMobileSimulation) {
            console.log('⚠️  WARNING: Appears to be mobile simulation in DevTools');
            console.log('💡 Turn off mobile simulation in Chrome DevTools and retry');
        }
        
        // Check Chrome DevTools detection
        const isDevToolsOpen = (
            window.outerHeight - window.innerHeight > 200 ||
            window.outerWidth - window.innerWidth > 200
        );
        
        console.log('🔧 DevTools likely open:', isDevToolsOpen ? '✅ Yes' : '❌ No');
        
        if (isDesktop || !navigator.userAgent.includes('Mobile')) {
            console.log('🖥️  Desktop PWA installability requires:');
            console.log('   - ✅ HTTPS with trusted certificate');
            console.log('   - ✅ Valid Web App Manifest');
            console.log('   - ✅ Service Worker');
            console.log('   - ✅ User engagement (may require user interaction)');
            console.log('   - ✅ No mobile simulation mode active');
            
            // Check if the certificate issue is the blocker
            if (window.location.protocol === 'https:' && !isSecureContext) {
                console.log('❌ CERTIFICATE ISSUE: HTTPS detected but not secure context');
                console.log('💡 This usually means certificate is self-signed or untrusted');
            }
        }
        
        // Summary
        console.log('\n📋 SUMMARY');
        const issues = [];
        
        if (window.location.protocol !== 'https:') issues.push('Not HTTPS');
        if (!isSecureContext) issues.push('Not secure context (certificate issue)');
        if (manifestLinks.length === 0) issues.push('No manifest');
        if (!installPromptAvailable) issues.push('No install prompt');
        
        // Reuse the mobile simulation check from above
        if (isLikelyMobileSimulation) {
            issues.push('Mobile simulation active');
        }
        
        if (issues.length === 0) {
            console.log('✅ All PWA requirements met - should be installable!');
        } else {
            console.log('❌ PWA installation blocked by:', issues.join(', '));
            
            if (issues.includes('No manifest')) {
                console.log('\n🔧 MANIFEST FIX:');
                console.log('The manifest link was added to index.html but may need server restart');
                console.log('1. Restart your dev server: bun run dev:app');
                console.log('2. Hard refresh the page (Ctrl+Shift+R)');
                console.log('3. Check Application tab in DevTools for manifest');
            }
            
            if (issues.includes('Mobile simulation active')) {
                console.log('\n🔧 MOBILE SIMULATION FIX:');
                console.log('1. Click the mobile/tablet icon in Chrome DevTools to disable simulation');
                console.log('2. Refresh the page');
                console.log('3. Run the diagnostic again');
            }
            
            if (issues.includes('No install prompt')) {
                console.log('\n🔧 INSTALL PROMPT FIX:');
                console.log('1. Ensure all other issues are resolved first');
                console.log('2. User interaction may be required (click, scroll, etc.)');
                console.log('3. Chrome may suppress prompts if previously dismissed');
                console.log('4. Try: chrome://settings/content/notifications and reset site permissions');
            }
            
            if (issues.includes('Not secure context (certificate issue)')) {
                console.log('\n🔧 CERTIFICATE FIX NEEDED:');
                console.log('For desktop PWA installation, you need:');
                console.log('1. A trusted certificate (not self-signed)');
                console.log('2. Certificate must match the exact domain/hostname');
                console.log('3. Certificate must be properly installed and trusted by the browser');
                console.log('\n💡 Options:');
                console.log('- Use localhost (automatically trusted in development)');
                console.log('- Get a proper SSL certificate for your domain');
                console.log('- Use mkcert to create locally trusted certificates');
            }
        }
        
        return {
            https: window.location.protocol === 'https:',
            secureContext: isSecureContext,
            hasManifest: manifestLinks.length > 0,
            installPromptAvailable,
            issues
        };
        
    } catch (error) {
        console.error('❌ PWA diagnostic failed:', error);
        return { error: error.message };
    }
}

// Function to manually trigger install prompt if available
function triggerInstallPrompt() {
    if (window.deferredPrompt) {
        console.log('🚀 Triggering PWA install prompt...');
        window.deferredPrompt.prompt();
        
        window.deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('✅ User accepted the install prompt');
            } else {
                console.log('❌ User dismissed the install prompt');
            }
            window.deferredPrompt = null;
        });
    } else {
        console.log('❌ No install prompt available');
    }
}

// Load the diagnostic
console.log('🔍 [PWA DIAGNOSTIC] PWA installability checker loaded!');
console.log('💡 Available functions:');
console.log('  - checkPWAInstallability() - Complete PWA diagnostic');
console.log('  - triggerInstallPrompt() - Manual install prompt (if available)');
console.log('');
console.log('🚀 Run: checkPWAInstallability() to diagnose the issue');
