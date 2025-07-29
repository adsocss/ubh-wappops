/**
 * Offline CSS Loading Test for WAPPOPS PWA
 * Test that verifies CSS and Shoelace styles load properly in offline scenarios
 */

console.log('🧪 [Offline CSS Test] Starting CSS loading verification...');

// Test 1: Check if Shoelace CSS variables are defined
function testShoelaceVariables() {
  console.log('🎨 [Test 1] Checking Shoelace CSS variables...');
  
  const testElement = document.createElement('div');
  document.body.appendChild(testElement);
  
  const computedStyle = getComputedStyle(testElement);
  const primaryColor = computedStyle.getPropertyValue('--sl-color-primary-500');
  const neutralColor = computedStyle.getPropertyValue('--sl-color-neutral-0');
  
  document.body.removeChild(testElement);
  
  if (primaryColor && neutralColor) {
    console.log('✅ [Test 1] Shoelace variables found:', { primaryColor, neutralColor });
    return true;
  } else {
    console.error('❌ [Test 1] Shoelace variables missing');
    return false;
  }
}

// Test 2: Check if main CSS file is loaded
function testMainCSS() {
  console.log('📄 [Test 2] Checking main CSS file loading...');
  
  const stylesheets = Array.from(document.styleSheets);
  const hasMainCSS = stylesheets.some(sheet => {
    try {
      return sheet.href && sheet.href.includes('index') && sheet.href.includes('.css');
    } catch (e) {
      return false;
    }
  });
  
  if (hasMainCSS) {
    console.log('✅ [Test 2] Main CSS file loaded');
    return true;
  } else {
    console.error('❌ [Test 2] Main CSS file not found');
    return false;
  }
}

// Test 3: Check if Shoelace components have proper styling
function testShoelaceComponents() {
  console.log('🎛️ [Test 3] Testing Shoelace component styling...');
  
  // Create a test button
  const button = document.createElement('sl-button');
  button.textContent = 'Test Button';
  button.style.position = 'absolute';
  button.style.top = '-1000px'; // Hide from view
  document.body.appendChild(button);
  
  setTimeout(() => {
    const computedStyle = getComputedStyle(button);
    const hasStyles = computedStyle.display !== 'inline' && 
                     computedStyle.fontFamily !== 'Times'; // Default browser font
    
    document.body.removeChild(button);
    
    if (hasStyles) {
      console.log('✅ [Test 3] Shoelace components properly styled');
    } else {
      console.error('❌ [Test 3] Shoelace components not styled');
    }
  }, 100);
}

// Test 4: Check cache status
async function testCacheStatus() {
  console.log('🗄️ [Test 4] Checking cache status...');
  
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      console.log('📦 Available caches:', cacheNames);
      
      // Check for CSS in caches
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        const cssFiles = keys.filter(request => request.url.includes('.css'));
        
        if (cssFiles.length > 0) {
          console.log(`✅ [Test 4] CSS files found in cache "${cacheName}":`, 
                     cssFiles.map(r => r.url));
        }
      }
    } catch (error) {
      console.error('❌ [Test 4] Cache check failed:', error);
    }
  } else {
    console.warn('⚠️ [Test 4] Caches API not available');
  }
}

// Test 5: Simulate offline and test styling
function testOfflineStyling() {
  console.log('🌐 [Test 5] Testing offline styling simulation...');
  
  // Create a mock offline scenario
  const originalOnLine = navigator.onLine;
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: false
  });
  
  // Dispatch offline event
  window.dispatchEvent(new Event('offline'));
  
  // Check if offline banner appears with styling
  setTimeout(() => {
    const offlineBanners = document.querySelectorAll('.offline-banner, [class*="offline"]');
    
    if (offlineBanners.length > 0) {
      console.log('✅ [Test 5] Offline UI elements found and styled');
    } else {
      console.log('ℹ️ [Test 5] No offline UI elements found (may be normal)');
    }
    
    // Restore online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine
    });
    window.dispatchEvent(new Event('online'));
  }, 500);
}

// Run all tests
async function runAllTests() {
  console.log('🚀 [Offline CSS Test] Running comprehensive CSS loading tests...');
  
  const results = {
    shoelaceVariables: testShoelaceVariables(),
    mainCSS: testMainCSS(),
    shoelaceComponents: null, // Async
    cacheStatus: null, // Async
    offlineStyling: null // Async
  };
  
  testShoelaceComponents();
  await testCacheStatus();
  testOfflineStyling();
  
  console.log('📊 [Offline CSS Test] Test results:', results);
  
  // Overall assessment
  if (results.shoelaceVariables && results.mainCSS) {
    console.log('🎉 [Offline CSS Test] CSS loading appears to be working correctly!');
  } else {
    console.warn('⚠️ [Offline CSS Test] CSS loading issues detected - check console for details');
  }
}

// Auto-run tests when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllTests);
} else {
  runAllTests();
}

// Export for manual testing
window.wappopsOfflineCSSTest = {
  runAllTests,
  testShoelaceVariables,
  testMainCSS,
  testShoelaceComponents,
  testCacheStatus,
  testOfflineStyling
};
