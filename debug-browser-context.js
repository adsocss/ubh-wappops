// Debug what's available in the browser context
// Run this in the browser console at https://vite.universalbeachhotels.com:5173

console.log('🔍 BROWSER CONTEXT DEBUGGER');
console.log('============================');

// Check what's available in window
console.log('\n🌐 Window object inspection:');
console.log('window.ubh exists:', !!window.ubh);

// Check for WAPPOPS shell component
const shell = document.querySelector('ubh-shell');
console.log('ubh-shell element exists:', !!shell);

if (shell) {
    console.log('shell.ctx exists:', !!shell.ctx);
    
    if (shell.ctx) {
        console.log('Available ctx properties:', Object.keys(shell.ctx));
        console.log('shell.ctx.webPush exists:', !!shell.ctx.webPush);
        console.log('shell.ctx.currentUser exists:', !!shell.ctx.currentUser);
        
        if (shell.ctx.currentUser) {
            console.log('User token exists:', !!shell.ctx.currentUser.authorizations?.token);
            console.log('User name:', shell.ctx.currentUser.name || 'No name');
        }
        
        // Store for later use
        window._wappopsCtx = shell.ctx;
    }
} else {
    console.log('❌ ubh-shell element not found - app may not be loaded yet');
}

if (window.ubh) {
    console.log('window.ubh.app exists:', !!window.ubh.app);
    
    if (window.ubh.app) {
        console.log('Available app properties:', Object.keys(window.ubh.app));
        console.log('window.ubh.app.webPush exists:', !!window.ubh.app.webPush);
        console.log('window.ubh.app.session exists:', !!window.ubh.app.session);
        
        if (window.ubh.app.session) {
            console.log('Session token exists:', !!window.ubh.app.session.token);
            console.log('Session user:', window.ubh.app.session.user?.name || 'No user');
        }
    }
} else {
    console.log('❌ window.ubh not found (this is normal for WAPPOPS)');
}

// Check if we're on the right page
console.log('\n📍 Page information:');
console.log('Current URL:', window.location.href);
console.log('Is HTTPS:', window.location.protocol === 'https:');
console.log('Is correct domain:', window.location.hostname === 'vite.universalbeachhotels.com');
console.log('Is correct port:', window.location.port === '5173');

// Check service worker registration (needed for WebPush)
console.log('\n🔧 Service Worker status:');
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log('Service Worker registrations:', registrations.length);
        registrations.forEach((reg, index) => {
            console.log(`SW ${index + 1}:`, reg.scope);
        });
    });
} else {
    console.log('❌ Service Worker not supported');
}

// Check notification permission
console.log('\n🔔 Notification status:');
console.log('Notification permission:', Notification.permission);
console.log('Notification supported:', 'Notification' in window);

// Check if we can access the WebPush service manually
console.log('\n🔍 Manual WebPush check:');
setTimeout(() => {
    const shell = document.querySelector('ubh-shell');
    const webPush = shell?.ctx?.webPush;
    
    if (webPush) {
        console.log('✅ WebPush service is now available!');
        console.log('WebPush properties:', Object.keys(webPush));
        console.log('Is supported:', webPush.isSupported);
        console.log('Permission:', webPush.permission);
        console.log('Is subscribed:', webPush.isSubscribed);
    } else if (window.ubh?.app?.webPush) {
        console.log('✅ WebPush service is now available!');
        console.log('WebPush properties:', Object.keys(window.ubh.app.webPush));
    } else {
        console.log('❌ WebPush service still not available after 2 seconds');
        console.log('💡 Try waiting a bit longer or refresh the page');
        console.log('💡 Make sure you are logged in to WAPPOPS');
    }
}, 2000);

// Export a function to check again
window.checkWebPushAvailability = function() {
    console.log('\n🔄 Re-checking WebPush availability...');
    
    const shell = document.querySelector('ubh-shell');
    const webPush = shell?.ctx?.webPush;
    
    if (webPush) {
        console.log('✅ WebPush service is available via shell.ctx!');
        console.log('Service properties:', Object.keys(webPush));
        console.log('Is supported:', webPush.isSupported);
        console.log('Permission:', webPush.permission);
        console.log('Is subscribed:', webPush.isSubscribed);
        window._wappopsCtx = shell.ctx;
        return true;
    } else if (window.ubh?.app?.webPush) {
        console.log('✅ WebPush service is available via window.ubh!');
        console.log('Service properties:', Object.keys(window.ubh.app.webPush));
        return true;
    } else {
        console.log('❌ WebPush service still not available');
        console.log('Shell element exists:', !!shell);
        console.log('Shell.ctx exists:', !!shell?.ctx);
        console.log('Available in shell.ctx:', shell?.ctx ? Object.keys(shell.ctx) : 'shell.ctx not found');
        console.log('User logged in:', !!shell?.ctx?.currentUser);
        return false;
    }
};

console.log('\n💡 Use checkWebPushAvailability() to check again');
