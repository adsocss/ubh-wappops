import { LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { registerSW } from 'virtual:pwa-register';

/**
 * PWA Update Manager - handles silent background updates only.
 * No visual UI - purely functional component for update coordination.
 * Relies on platform PWA manifest for single instance behavior.
 */
@customElement('pwa-badge')
export class PwaBadge extends LitElement {

    @property({ type: Number })
    private _period: number = 0 // Periodic update checks disabled by default
    
    @property({ type: Boolean })
    private _swActivated: boolean = false
    
    @state()
    private _needRefresh: boolean = false
    
    @property()
    private _updateServiceWorker: undefined | ((reloadPage?: boolean) => Promise<void>) = undefined

    firstUpdated() {
        // Ensure component is fully initialized before registering service worker
        setTimeout(() => {
            this._initializePWA();
        }, 100); // Small delay to ensure all properties are initialized
    }

    private _initializePWA() {
        console.log('[PWA Update Manager] Initializing PWA service worker...');
        
        try {
            this._updateServiceWorker = registerSW({
                immediate: true,
                // Silent updates - no user interaction required
                onOfflineReady: () => {
                    console.log('[PWA Update Manager] App ready to work offline');
                },
                onNeedRefresh: () => {
                    console.log('[PWA Update Manager] New version available, applying silent update...');
                    console.log('[PWA Update Manager] Platform manifest handles single instance behavior');
                    this._needRefresh = true;
                    // Auto-update silently without showing any alerts or UI
                    // Platform handles instance coordination automatically
                    this._refreshApp();
                },
                onRegisteredSW: this._onRegisteredSW.bind(this),
                onRegisterError: (error) => {
                    console.error('[PWA Update Manager] Service Worker registration failed:', error);
                }
            });
            
            console.log('[PWA Update Manager] Service worker registration initiated successfully');
        } catch (error) {
            console.error('[PWA Update Manager] Failed to initialize PWA:', error);
        }
    }

    protected render() {
        // ✅ NO VISUAL OUTPUT - This component is purely functional
        // Handles PWA updates silently in the background without user interaction
        // Single instance behavior is handled natively by the platform manifest
        return nothing;
    }


    private _refreshApp() {
        if (this._updateServiceWorker && this._needRefresh) {
            console.log('[PWA Update Manager] Applying silent update - page will reload automatically');
            console.log('[PWA Update Manager] Single instance behavior handled by platform manifest');
            
            // Apply the update silently - this will reload the page with the new version
            // Platform manifest launch_handler will handle single instance behavior
            this._updateServiceWorker(true);
        }
    }

    private _onRegisteredSW(swUrl: string, r?: ServiceWorkerRegistration) {
        console.log('[PWA Update Manager] Service worker registered:', swUrl);
        console.log('[PWA Update Manager] Period setting:', this._period);
        
        // Defensive check for _period property
        if (!this._period || this._period <= 0) {
            console.log('[PWA Update Manager] Periodic sync disabled (period = 0)');
            return;
        }
        
        if (r?.active?.state === 'activated') {
            this._swActivated = true
            this._registerPeriodicSync(swUrl, r)
        }
        else if (r?.installing) {
            r.installing.addEventListener('statechange', (e) => {
                const sw = e.target as ServiceWorker
                this._swActivated = sw.state === 'activated'
                if (this._swActivated)
                    this._registerPeriodicSync(swUrl, r)
            })
        }
    }

    private _registerPeriodicSync(swUrl: string, r: ServiceWorkerRegistration) {
        if (this._period <= 0) return

        setInterval(async () => {
            if ('onLine' in navigator && !navigator.onLine)
                return

            const resp = await fetch(swUrl, {
                cache: 'no-store',
                headers: {
                    'cache': 'no-store',
                    'cache-control': 'no-cache',
                },
            })

            if (resp?.status === 200)
                await r.update()
        }, this._period)
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'pwa-badge': PwaBadge
    }
}
