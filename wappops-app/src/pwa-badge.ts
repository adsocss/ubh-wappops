import { LitElement, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { registerSW } from 'virtual:pwa-register';
import { version } from '../package.json';
import { SlAlert } from '@shoelace-style/shoelace';

/**
 * PWA Badge element.
 */
@customElement('pwa-badge')
export class PwaBadge extends LitElement {
    @query('sl-alert')
    private _alert?: SlAlert

    @property({ type: Number })
    private _period = 0 // check for updates disabled
    @property( { type: Boolean } )
    private _swActivated = false
    @state()
    private _needRefresh = false
    @property()
    private _updateServiceWorker: undefined | ((reloadPage?: boolean) => Promise<void>)

    firstUpdated() {
        this._updateServiceWorker = registerSW({
            immediate: true,
            // onOfflineReady: () => (this._offlineReady = true),
            onNeedRefresh: () => (this._needRefresh = true),
            onRegisteredSW: this._onRegisteredSW
        })
    }

    protected render() {
        return this._needRefresh
            ? html`
                <sl-alert open>
                    Nueva versión ${version} lista para instalar.
                    <sl-button slot="footer" onclick=${this._refreshApp}>Continuar</sl-button>
                </sl-alert>
            `
            : nothing;
    }


    private _refreshApp() {
        if (this._updateServiceWorker && this._needRefresh) {
            this._updateServiceWorker()
        }

        if (this._alert) {
            this._alert.hide()
        }
    }

    private _onRegisteredSW(swUrl: string, r?: ServiceWorkerRegistration) {
        if (this._period <= 0) return
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
