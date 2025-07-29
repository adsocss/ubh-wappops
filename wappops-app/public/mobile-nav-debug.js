/**
 * Mobile Navigation Debug Utilities for WAPPOPS
 * 
 * This script provides debugging tools specifically for mobile navigation issues
 * where users get stuck on blank pages after saving forms.
 * 
 * Usage:
 * 1. Load in browser console: window.mobileNavDebug
 * 2. Run diagnostics: mobileNavDebug.runDiagnostics()
 * 3. Force navigation reset: mobileNavDebug.forceNavigationReset()
 */

window.mobileNavDebug = {
    
    // Check current navigation state
    checkNavigationState() {
        console.log('🧭 [Mobile Nav Debug] Navigation State Check');
        console.log('Current hash:', window.location.hash);
        console.log('Is mobile:', /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        
        const shell = document.querySelector('ubh-shell');
        const view = document.querySelector('ubh-tasks-view');
        const drawer = document.querySelector('sl-drawer#details');
        
        console.log('Shell element:', shell ? '✅ Found' : '❌ Missing');
        console.log('Tasks view:', view ? '✅ Found' : '❌ Missing');
        console.log('Details drawer:', drawer ? '✅ Found' : '❌ Missing');
        
        if (view) {
            const shadowRoot = view.shadowRoot;
            const ubhView = shadowRoot?.querySelector('ubh-view');
            const mobileDrawer = ubhView?.shadowRoot?.querySelector('#details');
            
            console.log('View shadow root:', shadowRoot ? '✅ Found' : '❌ Missing');
            console.log('UBH View component:', ubhView ? '✅ Found' : '❌ Missing');
            console.log('Mobile drawer:', mobileDrawer ? '✅ Found' : '❌ Missing');
            
            if (mobileDrawer) {
                console.log('Mobile drawer open:', mobileDrawer.open || false);
                console.log('Mobile drawer style:', mobileDrawer.style.cssText);
            }
        }
        
        return {
            hash: window.location.hash,
            hasShell: !!shell,
            hasView: !!view,
            hasDrawer: !!drawer
        };
    },
    
    // Check for stuck states
    checkStuckStates() {
        console.log('🚨 [Mobile Nav Debug] Stuck State Check');
        
        const tasksView = document.querySelector('ubh-tasks-view');
        if (tasksView && tasksView.shadowRoot) {
            const ubhView = tasksView.shadowRoot.querySelector('ubh-view');
            if (ubhView && ubhView.shadowRoot) {
                const detailsDrawer = ubhView.shadowRoot.querySelector('#details');
                
                if (detailsDrawer) {
                    const isOpen = detailsDrawer.open;
                    const hasContent = detailsDrawer.innerHTML.trim().length > 0;
                    
                    console.log('Details drawer open:', isOpen);
                    console.log('Details drawer has content:', hasContent);
                    console.log('Details drawer innerHTML length:', detailsDrawer.innerHTML.length);
                    
                    if (!isOpen && hasContent) {
                        console.warn('⚠️ STUCK STATE DETECTED: Drawer closed but has content');
                        return 'drawer_closed_with_content';
                    }
                    
                    if (isOpen && !hasContent) {
                        console.warn('⚠️ STUCK STATE DETECTED: Drawer open but no content');
                        return 'drawer_open_no_content';
                    }
                }
            }
        }
        
        // Check for invisible content
        const allElements = document.querySelectorAll('*');
        let invisibleCount = 0;
        
        allElements.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                invisibleCount++;
            }
        });
        
        console.log(`Found ${invisibleCount} invisible elements`);
        
        if (invisibleCount > allElements.length * 0.8) {
            console.warn('⚠️ STUCK STATE DETECTED: Most elements are invisible');
            return 'most_elements_invisible';
        }
        
        return 'normal';
    },
    
    // Force close all mobile drawers
    forceCloseDrawers() {
        console.log('🔧 [Mobile Nav Debug] Force closing all drawers');
        
        const drawers = document.querySelectorAll('sl-drawer');
        drawers.forEach((drawer, index) => {
            if (drawer.open) {
                console.log(`Closing drawer ${index}:`, drawer);
                drawer.hide();
            }
        });
        
        // Also check shadow DOM drawers
        const tasksView = document.querySelector('ubh-tasks-view');
        if (tasksView && tasksView.shadowRoot) {
            const ubhView = tasksView.shadowRoot.querySelector('ubh-view');
            if (ubhView && ubhView.shadowRoot) {
                const detailsDrawer = ubhView.shadowRoot.querySelector('#details');
                if (detailsDrawer && detailsDrawer.open) {
                    console.log('Closing shadow DOM details drawer');
                    detailsDrawer.hide();
                }
            }
        }
    },
    
    // Reset navigation to clean state
    forceNavigationReset() {
        console.log('🔄 [Mobile Nav Debug] Force navigation reset');
        
        // Close all drawers first
        this.forceCloseDrawers();
        
        // Clear any selected states
        const tasksView = document.querySelector('ubh-tasks-view');
        if (tasksView) {
            // Try to access internal state (this is for debugging)
            console.log('Attempting to reset tasks view state...');
            
            // Force re-render by triggering a hash change
            const currentHash = window.location.hash;
            window.location.hash = '#/';
            setTimeout(() => {
                window.location.hash = currentHash || '#/tasks';
            }, 100);
        }
    },
    
    // Monitor navigation events
    startNavigationMonitoring() {
        console.log('👁️ [Mobile Nav Debug] Starting navigation monitoring');
        
        let eventCount = 0;
        const maxEvents = 50; // Prevent log spam
        
        const logEvent = (type, event) => {
            if (eventCount++ < maxEvents) {
                console.log(`📍 [Nav Monitor] ${type}:`, event);
            }
        };
        
        // Monitor hash changes
        window.addEventListener('hashchange', (e) => logEvent('hashchange', {
            oldURL: e.oldURL,
            newURL: e.newURL,
            hash: window.location.hash
        }));
        
        // Monitor custom events
        ['ubh-close-details', 'ubh-form-saved', 'ubh-list-item-selected'].forEach(eventType => {
            document.addEventListener(eventType, (e) => logEvent(eventType, {
                target: e.target.tagName,
                detail: e.detail
            }));
        });
        
        // Monitor drawer events  
        document.addEventListener('sl-show', (e) => logEvent('sl-show', e.target));
        document.addEventListener('sl-hide', (e) => logEvent('sl-hide', e.target));
        document.addEventListener('sl-after-show', (e) => logEvent('sl-after-show', e.target));
        document.addEventListener('sl-after-hide', (e) => logEvent('sl-after-hide', e.target));
        
        console.log('Navigation monitoring active. Check console for events.');
        console.log(`Will log up to ${maxEvents} events to prevent spam.`);
    },
    
    // Test mobile navigation flow
    testMobileFlow() {
        console.log('🧪 [Mobile Nav Debug] Testing mobile navigation flow');
        
        if (!this.isMobile()) {
            console.warn('⚠️ Not on mobile device - test may not be accurate');
        }
        
        // Simulate the problematic flow
        console.log('Step 1: Navigate to tasks');
        window.location.hash = '#/tasks';
        
        setTimeout(() => {
            console.log('Step 2: Simulate task selection');
            const taskCard = document.querySelector('ubh-task-card');
            if (taskCard) {
                taskCard.click();
                console.log('Task card clicked');
            } else {
                console.warn('No task card found for testing');
            }
        }, 1000);
    },
    
    // Check if mobile
    isMobile() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Run all diagnostics
    runDiagnostics() {
        console.log('🔍 [Mobile Nav Debug] Running full diagnostics...');
        console.log('='.repeat(50));
        
        const navState = this.checkNavigationState();
        const stuckState = this.checkStuckStates();
        
        console.log('='.repeat(50));
        console.log('📋 DIAGNOSTIC SUMMARY');
        console.log('Navigation state:', navState);
        console.log('Stuck state:', stuckState);
        console.log('Is mobile device:', this.isMobile());
        console.log('Current time:', new Date().toISOString());
        
        if (stuckState !== 'normal') {
            console.log('');
            console.log('🔧 SUGGESTED FIXES:');
            console.log('1. Run: mobileNavDebug.forceNavigationReset()');
            console.log('2. Run: mobileNavDebug.forceCloseDrawers()');
            console.log('3. Refresh the page');
        }
        
        return {
            navState,
            stuckState,
            isMobile: this.isMobile(),
            timestamp: new Date().toISOString()
        };
    }
};

// Auto-run diagnostics if stuck state detected
if (document.readyState === 'complete') {
    setTimeout(() => {
        const result = window.mobileNavDebug.runDiagnostics();
        if (result.stuckState !== 'normal') {
            console.warn('🚨 Stuck state detected on page load! Run mobileNavDebug.forceNavigationReset() to fix.');
        }
    }, 2000);
} else {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const result = window.mobileNavDebug.runDiagnostics();
            if (result.stuckState !== 'normal') {
                console.warn('🚨 Stuck state detected on page load! Run mobileNavDebug.forceNavigationReset() to fix.');
            }
        }, 2000);
    });
}

console.log('📱 Mobile Navigation Debug loaded. Use: mobileNavDebug.runDiagnostics()');
