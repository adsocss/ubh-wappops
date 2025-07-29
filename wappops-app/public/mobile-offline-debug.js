// Mobile Offline Debug Script
// Add this to browser console to debug mobile offline issues

window.mobileOfflineDebug = {
  
  async runAllTests() {
    console.log('📱 [Mobile Debug] Starting comprehensive mobile offline tests...');
    
    await this.checkEnvironment();
    await this.checkServiceWorker();
    await this.checkJavaScriptCache();
    await this.checkCSSCache();
    await this.checkCriticalResources();
    await this.checkLocalStorage();
    await this.checkOfflineInitialization();
    
    console.log('📱 [Mobile Debug] All tests completed!');
  },
  
  async checkEnvironment() {
    console.log('🌐 [Mobile Debug] Environment Check:');
    console.log('   User Agent:', navigator.userAgent);
    console.log('   Online Status:', navigator.onLine);
    console.log('   Connection:', navigator.connection ? navigator.connection.effectiveType : 'Unknown');
    
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('   Mobile Device:', isMobile);
    
    if (isMobile) {
      console.log('✅ Mobile device detected');
    } else {
      console.log('⚠️ Desktop device (simulating mobile)');
    }
  },
  
  async checkServiceWorker() {
    console.log('🔧 [Mobile Debug] Service Worker Check:');
    
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          console.log('✅ Service Worker registered');
          console.log('   Scope:', registration.scope);
          console.log('   Script URL:', registration.active?.scriptURL);
          console.log('   State:', registration.active?.state);
          
          // Check if our push handler is loaded
          if (registration.active?.scriptURL.includes('sw.js')) {
            console.log('✅ Production service worker active');
          } else if (registration.active?.scriptURL.includes('dev-sw')) {
            console.log('ℹ️ Development service worker active');
          }
        } else {
          console.log('❌ No service worker registration found');
        }
      } catch (error) {
        console.log('❌ Service worker check failed:', error);
      }
    } else {
      console.log('❌ Service Worker not supported');
    }
  },
  
  async checkJavaScriptCache() {
    console.log('📦 [Mobile Debug] JavaScript Cache Check:');
    
    try {
      const cacheNames = await caches.keys();
      console.log('   Available caches:', cacheNames);
      
      // Check js-modules cache
      const jsCache = await caches.open('js-modules');
      const jsRequests = await jsCache.keys();
      
      console.log(`   JS Cache entries: ${jsRequests.length}`);
      
      // Look for main bundle
      let mainBundleFound = false;
      for (const request of jsRequests) {
        const url = request.url;
        console.log('   JS file:', url);
        
        if (url.includes('index-') && url.includes('.js')) {
          console.log('✅ Main bundle found in cache:', url);
          mainBundleFound = true;
        }
      }
      
      if (!mainBundleFound) {
        console.log('❌ Main JavaScript bundle NOT found in cache');
        console.log('   This could cause blank page on mobile offline');
      }
      
      // Check wappops-js-priority cache (our custom cache)
      try {
        const priorityCache = await caches.open('wappops-js-priority');
        const priorityRequests = await priorityCache.keys();
        console.log(`   Priority JS Cache entries: ${priorityRequests.length}`);
        
        for (const request of priorityRequests) {
          console.log('   Priority JS:', request.url);
        }
      } catch (error) {
        console.log('   No priority JS cache yet');
      }
      
    } catch (error) {
      console.log('❌ JavaScript cache check failed:', error);
    }
  },
  
  async checkCSSCache() {
    console.log('🎨 [Mobile Debug] CSS Cache Check:');
    
    try {
      // Check main CSS cache
      const cssCache = await caches.open('css-styles');
      const cssRequests = await cssCache.keys();
      
      console.log(`   CSS Cache entries: ${cssRequests.length}`);
      
      let mainCSSFound = false;
      for (const request of cssRequests) {
        const url = request.url;
        console.log('   CSS file:', url);
        
        if (url.includes('index-') && url.includes('.css')) {
          console.log('✅ Main CSS bundle found in cache:', url);
          mainCSSFound = true;
        }
      }
      
      if (!mainCSSFound) {
        console.log('❌ Main CSS bundle NOT found in cache');
      }
      
      // Check priority CSS cache
      try {
        const priorityCache = await caches.open('wappops-css-priority');
        const priorityRequests = await priorityCache.keys();
        console.log(`   Priority CSS Cache entries: ${priorityRequests.length}`);
      } catch (error) {
        console.log('   No priority CSS cache yet');
      }
      
    } catch (error) {
      console.log('❌ CSS cache check failed:', error);
    }
  },
  
  async checkCriticalResources() {
    console.log('⚡ [Mobile Debug] Critical Resources Check:');
    
    const criticalFiles = [
      '/',
      '/index.html',
      '/pwa-512x512.png',
      '/favicon.ico'
    ];
    
    for (const file of criticalFiles) {
      try {
        const response = await caches.match(file);
        if (response) {
          console.log(`✅ "${file}" is cached`);
        } else {
          console.log(`❌ "${file}" is NOT cached`);
        }
      } catch (error) {
        console.log(`❌ Error checking "${file}":`, error);
      }
    }
  },
  
  async checkLocalStorage() {
    console.log('💾 [Mobile Debug] Local Storage Check:');
    
    const userKey = 'USER_KEY'; // Adjust if different
    const storedUser = localStorage.getItem(userKey);
    
    if (storedUser) {
      console.log('✅ User data found in localStorage');
      try {
        const userData = JSON.parse(storedUser);
        console.log('   User:', userData.username || userData.name || 'Unknown');
        console.log('   Data size:', storedUser.length, 'chars');
      } catch (error) {
        console.log('❌ User data corrupted:', error);
      }
    } else {
      console.log('⚠️ No user data in localStorage');
      console.log('   This will require login even offline');
    }
    
    // Check other important keys
    const keys = Object.keys(localStorage);
    console.log(`   Total localStorage keys: ${keys.length}`);
    
    for (const key of keys) {
      if (key.includes('wapp') || key.includes('user') || key.includes('auth')) {
        console.log(`   Key: ${key} (${localStorage.getItem(key)?.length || 0} chars)`);
      }
    }
  },
  
  async checkOfflineInitialization() {
    console.log('🚀 [Mobile Debug] Offline Initialization Check:');
    
    // Check if shell component exists
    const shell = document.querySelector('ubh-shell');
    if (shell) {
      console.log('✅ Shell component found');
      
      // Check if it's initializing
      const initDiv = shell.shadowRoot?.querySelector('.initializing');
      if (initDiv) {
        console.log('⚠️ App is still initializing');
        console.log('   This might indicate stuck initialization');
      }
      
      // Check for blank content
      const content = shell.shadowRoot?.innerHTML || '';
      if (content.trim().length === 0) {
        console.log('❌ Shell has no content - blank page issue confirmed');
      } else if (content.includes('ubh-login')) {
        console.log('✅ Login component detected');
      } else if (content.includes('ubh-busy')) {
        console.log('ℹ️ Busy indicator showing');
      }
    } else {
      console.log('❌ Shell component not found');
      console.log('   Main app may not have loaded');
    }
    
    // Check for Lit components
    const customElements = Array.from(document.querySelectorAll('*')).filter(el => 
      el.tagName.includes('-') || el.tagName.startsWith('UBH')
    );
    
    console.log(`   Custom elements found: ${customElements.length}`);
    customElements.slice(0, 5).forEach(el => {
      console.log(`   - ${el.tagName}`);
    });
  },
  
  async simulateOfflineTest() {
    console.log('📴 [Mobile Debug] Simulating Offline Test:');
    console.log('1. Open DevTools');
    console.log('2. Go to Network tab');
    console.log('3. Check "Offline" checkbox');
    console.log('4. Refresh the page');
    console.log('5. Check console for offline behavior');
    
    // Also try to detect if we're offline
    if (!navigator.onLine) {
      console.log('✅ Browser reports offline status');
      await this.runAllTests();
    }
  }
};

// Auto-run basic tests
console.log('📱 Mobile Offline Debug Script Loaded');
console.log('📱 Run: mobileOfflineDebug.runAllTests()');
console.log('📱 Or run individual tests like: mobileOfflineDebug.checkJavaScriptCache()');

// If we detect we're offline, auto-run tests
if (!navigator.onLine) {
  console.log('📴 Offline detected - running automatic tests...');
  setTimeout(() => window.mobileOfflineDebug.runAllTests(), 2000);
}
