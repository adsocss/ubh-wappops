import { provide } from "@lit/context";
import { IUser } from "@model/data-model";
import { SlDrawer } from "@shoelace-style/shoelace";
import { css, html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { EVT_LOGOUT } from "../../application/events";
import { USER_KEY } from "../../application/local-storage-keys";
import { EVT_NOTIFICATION } from "../../application/services/NotificationsService";
import { EVT_SYNC_FINISHED, EVT_SYNC_STARTED } from "../../application/services/synchronizer";
import { Wappops, wappops } from "../../application/wappops";
import appLogo from "../../assets/logo.svg";
import "../../pwa-badge";
import "../auth/ubh-login";
import { isMobile } from "../base/ubh-component";
import { EVT_LIST_LOADED, EVT_LIST_LOADING } from "../base/ubh-list";
import { menuIcon } from "../common/icons";
import "../common/ubh-busy";
import UbhBusy from "../common/ubh-busy";
import "../common/ubh-theme-toggle";
import "../common/ubh-user";
import { resetStyles } from "../css/reset.css";
import "../housekeeping/ubh-rooms-status-view";
import "../maintenance/ubh-counters-view";
import "../notifications/ubh-notifications-alert";
import { UbhNotificationsAlert } from "../notifications/ubh-notifications-alert";
import "../notifications/ubh-notifications-list";
import { UbhNotificationsList } from "../notifications/ubh-notifications-list";
import "../tasks/ubh-tasks-view";
import { ViewType } from "./IViewDeclaration";
import "./ubh-menu";
import "./ubh-preferences";
import "./ubh-sync";


@customElement("ubh-shell")
export default class UbhShell extends LitElement {
    @query("#aside")
    private menu!: SlDrawer | HTMLElement;
    @query("#sync-indicator")
    private syncIndicator?: UbhBusy;
    @query("#busy-indicator")
    private busyIndicator?: UbhBusy;
    @query("ubh-notifications-alert")
    private notificationsAlert!: UbhNotificationsAlert;
    @query("#notifications-panel")
    private notificationsPanel!: SlDrawer;
    @query('ubh-notifications-list')
    private notificationsList!: UbhNotificationsList;


    @provide({ context: wappops })
    readonly ctx = new Wappops();

    @state()
    private syncDone: boolean = false;

    @state()
    private _currentView: ViewType | undefined = undefined;
    // private currentViewInstance?: UbhView | undefined = undefined;
    private autoLoginDone: boolean = false;

    @state()
    private isOffline: boolean = false;

    @state()
    private isInitializing: boolean = true;

    /* Monitor de redimensionamiento del documento */
    private resizeObserver: ResizeObserver | undefined = undefined;

    /**
     * Constructor
     */
    constructor() {
        super();
        this.resizeObserver = new ResizeObserver(() => {
            this.requestUpdate();
        });
        this.resizeObserver.observe(document.body);
        window.location.hash = "#/";
        
        // Enhanced mobile offline detection
        this.isOffline = !navigator.onLine;
        this.handleOfflineStatus();
        
        // Add mobile-specific offline detection
        const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobileDevice) {
            console.log('[Shell] Mobile device detected - enhanced offline handling');
            
            // Listen for mobile-specific network events
            window.addEventListener('online', () => {
                console.log('[Shell] Mobile came online');
                this.isOffline = false;
                this.requestUpdate();
            });
            
            window.addEventListener('offline', () => {
                console.log('[Shell] Mobile went offline');
                this.isOffline = true;
                this.requestUpdate();
            });
        }
        
        // Add safety timeout for initialization with mobile-specific handling
        const initTimeout = setTimeout(() => {
            if (this.isInitializing) {
                console.warn('[Shell] Initialization timeout - forcing app to show');
                console.warn('[Shell] Mobile offline status:', this.isOffline);
                console.warn('[Shell] Navigator online:', navigator.onLine);
                
                // Force show app even if initialization incomplete
                this.isInitializing = false;
                
                // If offline and no user, try to show emergency login
                if (this.isOffline && !this.ctx.currentUser) {
                    console.log('[Shell] Mobile offline - attempting emergency login setup');
                }
                
                this.requestUpdate();
            }
        }, 6000); // Reduced to 6 seconds for mobile (was 8)
        
        this.autologin().finally(() => {
            clearTimeout(initTimeout);
        });
    }

    /* Determina si la vista a aplicar es para dispositivos móviles */
    private isMobile() {
        return isMobile();
    }

    /* Tratar evento de login y establecer la vista inicial */
    private async handleLogin(event: CustomEvent) {
        this.ctx.currentUser = event.detail as IUser;

        await this.updateComplete;
        
        // MOBILE FIX: Safely access busyIndicator with null checks
        console.log('[Shell] Login successful, showing busy indicator...');
        if (this.busyIndicator?.show) {
            this.busyIndicator.show();
        } else {
            console.warn('[Shell] busyIndicator not available during login, waiting...');
            await this.updateComplete;
            this.busyIndicator?.show();
        }
        
        try {
            await this.ctx.synchronizer.syncAll();
            this.ctx.synchronizer.startPeriodicTask();
            // Initialize Web Push notifications
            await this.ctx.webPush?.initialize();
        } catch (error) {
            throw error;
        } finally {
            // Retardo para dar tiempo a que el componente esté construido
            await new Promise(r => setTimeout(r, 2000));

            await this.setDefaultView();
            
            // MOBILE FIX: Safely hide busyIndicator with null check
            this.busyIndicator?.hide();
            this.requestUpdate();
        }
    }

    /*
     * Handle offline status changes and setup event listeners
     */
    private handleOfflineStatus() {
        const updateOfflineStatus = () => {
            this.isOffline = !navigator.onLine;
            this.requestUpdate();
        };

        window.addEventListener('online', updateOfflineStatus);
        window.addEventListener('offline', updateOfflineStatus);
    }

    /*
     * Intentar login automático con la información de usuario
     * almacenada en localStorage.
     */
    private async autologin() {
        console.log('[Shell] Starting autologin process...');
        
        if (this.autoLoginDone) {
            console.log('[Shell] Autologin already completed');
            return;
        }

        const storedUser = localStorage.getItem(USER_KEY);
        if (!storedUser) {
            console.log('[Shell] No stored user found - showing login');
            this.isInitializing = false;
            this.requestUpdate(); // Show login page if no stored user
            return;
        }

        // If offline, skip API validation and use stored data
        if (!navigator.onLine) {
            console.log('[Shell] Offline mode - using stored user data');
            try {
                const user = JSON.parse(storedUser);
                this.ctx.currentUser = user;
                this.autoLoginDone = true;
                this.isInitializing = false;
                this.requestUpdate();
                await this.setDefaultView();
                console.log('[Shell] Offline autologin completed');
            } catch (error) {
                console.error('[Shell] Error parsing stored user data:', error);
                this.isInitializing = false;
                this.requestUpdate(); // Show login page
            }
            return;
        }

        console.log('[Shell] Online mode - validating session');
        await this.updateComplete;

        // Reset de vista inicial
        this._currentView = undefined;
        window.location.hash = "";

        // MOBILE FIX: Safely access busyIndicator with null checks
        console.log('[Shell] Showing busy indicator...');
        if (this.busyIndicator?.show) {
            this.busyIndicator.show();
        } else {
            console.warn('[Shell] busyIndicator not available yet, waiting...');
            await this.updateComplete;
            this.busyIndicator?.show();
        }
        
        try {
            await this.ctx.api.validateSession();
            console.log('[Shell] Session validated successfully');
            this.autoLoginDone = true;
            await this.ctx.synchronizer.syncAll();
            this.ctx.synchronizer.startPeriodicTask();
            console.log('[Shell] Synchronization completed');
        } catch (error) {
            console.error('[Shell] Session validation failed:', error);
            // Si hay error, se asume que la sesión ha caducado
            this.logout();
        } finally {
            // Reduced delay - only wait for component to be ready
            await new Promise(r => setTimeout(r, 500)); // Reduced from 2000ms to 500ms
            console.log('[Shell] Completing autologin process...');
            this.isInitializing = false;
            this.requestUpdate();
            await this.setDefaultView();
            
            // MOBILE FIX: Safely hide busyIndicator with null check
            this.busyIndicator?.hide();
            console.log('[Shell] Autologin process completed');
        }
    }

    /* Establecer la vista inicial por defecto */
    // TODO: Establecer vista por defecto según permisos del usuario
    private async setDefaultView() {

        // MOBILE FIX: Safely access busyIndicator with null check
        this.busyIndicator?.show();

        // Retardo para dar tiempo a la sincronización inicial
        await new Promise(r => setTimeout(r, 5000));

        // MOBILE FIX: Safely hide busyIndicator with null check
        this.busyIndicator?.hide();

        if (this.ctx.currentUser) {
            window.location.hash = "#/tasks";
        } else {
            window.location.hash = "#/login";
        }
    }

    /* Cerrar sesión */
    private logout() {
        this.ctx.api.logout();
        this.closeMenu();
        this.ctx.currentUser = undefined;
        window.location.hash = "#/login";
    }

    /* Tratar evento de logout y establecer la vista inicial */
    private handleLogout(_event: Event) {
        this.logout();
    }

    /* Conmutar la visibilidad del menú */
    private handleToggleMenu() {
        if (this.menu) {
            if (this.menu instanceof SlDrawer) {
                this.menu.open = !this.menu.open;
            } else {
                this.menu.toggleAttribute("open");
            }
        }
    }

    /* Cerrar menú */
    private closeMenu() {
        if (this.menu) {
            if (this.menu instanceof SlDrawer) {
                this.menu.hide();
                // this.menu.open = false;
            } else {
                this.menu.removeAttribute("open");
            }
        }
    }

    /* Abrir / Cerrar panel de notificaciones */
    private toggleNotificationsPanel() {
        if (this.notificationsPanel) {
            if (this.notificationsPanel.open) {
                this.notificationsPanel.hide();
            } else {
                this.notificationsPanel.show();
            }
        }
    }

    private handleNotification(event: Event) {
        console.log("handleNotification", event);

        this.notificationsAlert?.updateCount();
        this.notificationsList?.reload();
        this.requestUpdate();
    }

    /* Tratar eventos de navegación */
    private handleNavigation(event: HashChangeEvent) {
        // Cerrar menú cuando se selecciona una opción
        // y se está en modo móvil.
        if (this.menu instanceof SlDrawer) {
            this.closeMenu();
        }

        const hash = new URL(event.newURL).hash;
        switch (hash) {
            case "#/login":
                this._currentView = 'login';
                break;
            case "#/tasks":
                this._currentView = 'tasks';
                break;
            case "#/rooms-status":
                this._currentView = 'rooms-status';
                break;
            case "#/resource-counters":
                this._currentView = 'resource-counters';
                break;
            case "#/synchronization":
                this._currentView = 'synchronization';
                break;
            case "#/preferences":
                this._currentView = 'preferences';
                break;
            default:
                this._currentView = 'login';
        }
    }

    /* Conmutar indicador de trabajo en curso */
    private toggleBusyIndicator(event: Event) {
        if (event.type === EVT_LIST_LOADING && this.syncDone) {
            this.busyIndicator?.show();
        } else {
            if (this.syncDone) {
                this.busyIndicator?.hide();
            }
        }
    }

    private syncStarted(_event: Event) {
        this.syncDone = false;
        this.syncIndicator?.show();
        this.requestUpdate();
    }

    private syncFinished(_event: Event) {
        this.syncDone = true;
        this.syncIndicator?.hide();
        this.requestUpdate();
    }


    private setTheme() {
        const html = document.querySelector('html');
        if (html) {
            const currentTheme = this.ctx.configuration.preferences.theme || 'light';
            html.classList.remove('sl-theme-light', 'sl-theme-dark');
            html.classList.add(currentTheme === 'light' ? 'sl-theme-light' : 'sl-theme-dark');
        }
    }   

    connectedCallback(): void {
        super.connectedCallback();
        
        this.setTheme();
        window.addEventListener("hashchange", this.handleNavigation.bind(this));
        document.addEventListener(EVT_LOGOUT, this.handleLogout.bind(this));
        document.addEventListener(EVT_SYNC_STARTED, this.syncStarted.bind(this));
        document.addEventListener(EVT_SYNC_FINISHED, this.syncFinished.bind(this));
        document.addEventListener(EVT_NOTIFICATION, this.handleNotification.bind(this));
        this.addEventListener(EVT_LIST_LOADING, this.toggleBusyIndicator.bind(this));
        this.addEventListener(EVT_LIST_LOADED, this.toggleBusyIndicator.bind(this));
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        
        window.removeEventListener("hashchange", this.handleNavigation);
        document.removeEventListener(EVT_LOGOUT, this.handleLogout);
        document.removeEventListener(EVT_SYNC_STARTED, this.syncStarted);
        document.removeEventListener(EVT_SYNC_FINISHED, this.syncFinished);
        document.removeEventListener(EVT_NOTIFICATION, this.handleNotification);
        this.removeEventListener(EVT_LIST_LOADING, this.toggleBusyIndicator);
        this.removeEventListener(EVT_LIST_LOADED, this.toggleBusyIndicator);
    }

    // Visualizar shell o login
    protected render() {
        // Show loading indicator while initializing
        if (this.isInitializing) {
            return html`
                <div class="initializing">
                    <ubh-busy message="Iniciando aplicación..." opaque></ubh-busy>
                </div>
            `;
        }

        // Mobile offline emergency fallback
        if (this.isOffline && !this.ctx.currentUser) {
            const storedUser = localStorage.getItem(USER_KEY);
            if (storedUser) {
                console.log('[Shell] Mobile offline - found stored user, attempting recovery');
                try {
                    this.ctx.currentUser = JSON.parse(storedUser);
                    this.requestUpdate();
                } catch (error) {
                    console.error('[Shell] Failed to parse stored user:', error);
                }
            }
        }

        let template: TemplateResult | undefined = undefined
        if (!this.ctx.currentUser) {
            template = this.renderLogin();
        } else {
            // For offline mode, show main view even if sync isn't done
            if (this.syncDone || this.isOffline) {
                template = this.renderMain();
            } else {
                // Still syncing - show loading
                template = html`
                    <div class="syncing">
                        <ubh-busy message="Sincronizando datos..." opaque></ubh-busy>
                    </div>
                `;
            }
        }

        return html`
            ${template}
            ${this.renderNotificationsPanel()}
            <ubh-busy id="busy-indicator"></ubh-busy>
            <ubh-busy id="sync-indicator" message="Sincronizando" opaque></ubh-busy>
            <pwa-badge></pwa-badge>
        `;
    }

    /* Vista principal de la aplicación */
    protected renderMain() {
        if (this.isMobile()) {
            return this.renderMobile();
        }

        return html`
            <div id="wrapper">
                <header>
                    <section id="header-left">
                        <div id="menu-toggle" @click=${this.handleToggleMenu}>${menuIcon}</div>
                        <img src="${appLogo}" alt="Logo" id="app-logo" />
                    </section>
                    <section id="header-center">
                        <span id="app-name">${this.ctx.appName}</span>
                    </section>
                    <section id="header-right">
                        <ubh-notifications-alert @click=${this.toggleNotificationsPanel}></ubh-notifications-alert>
                        <ubh-theme-toggle></ubh-theme-toggle>
                        <ubh-user></ubh-user>
                    </section>
                </header>
                <main>
                    <aside id="aside" open>
                        <ubh-menu></ubh-menu>
                    </aside>
                    <div id="view">
                        ${this.renderView()}
                    </div>
                </main>
            </div>
        `;
    }

    /* Vista principal de la aplicación en móvil */
    protected renderMobile() {
        return html`
            <div id="wrapper">
                <header>
                    <section id="header-left">
                        <div id="menu-toggle" @click=${this.handleToggleMenu}>${menuIcon}</div>
                        <span id="app-name">${this.ctx.appName}</span>
                    </section>
                    <section id="header-right">
                        <ubh-notifications-alert @click=${this.toggleNotificationsPanel}></ubh-notifications-alert>
                    </section>
                </header>
                <main>
                    <sl-drawer id="aside" placement="start">
                        <ubh-menu></ubh-menu>
                    </sl-drawer>
                    <div id="view">
                        ${this.renderView()}
                    </div>
                </main>
            </div>
        `;
    }

    /* Visualizar la vista actual */
    protected renderView() {
        if (!this._currentView) {
            this.setDefaultView();
        }

        switch (this._currentView) {
            case 'tasks':
                return this.renderTasks();
            case 'rooms-status':
                return this.renderRoomsStatus();
            case 'resource-counters':
                return this.renderResourceCounters();
            case 'synchronization':
                return html`<ubh-sync></ubh-sync>`;
            case 'preferences':
                return html`<ubh-preferences></ubh-preferences>`;
            default:
                return nothing;
        }
    }

    private renderLogin() {
        return html`
            ${this.isOffline ? html`
                <div class="offline-banner">
                    <sl-alert variant="warning" open>
                        <sl-icon slot="icon" name="wifi-off"></sl-icon>
                        Modo sin conexión - Algunas funciones pueden estar limitadas
                    </sl-alert>
                </div>
            ` : nothing}
            <ubh-login @ubh-login=${this.handleLogin}></ubh-login>
        `;
    }

    private renderTasks() {
        return html`<ubh-tasks-view></ubh-tasks-view>`;
    }

    private renderRoomsStatus() {
        return html`<ubh-rooms-status-view></ubh-rooms-status-view>`;
    }

    private renderResourceCounters() {
        return html`<ubh-counters-view></ubh-counters-view>`;
    }

    private renderNotificationsPanel() {
        return html`
            <sl-drawer id="notifications-panel" label="Notificaciones" placement="end">
                <ubh-notifications-list></ubh-notifications-list>
            </sl-drawer>
        `;
    }

    static componentStyles = css`
        :host {
            display: block;
            width: 100%;
            max-width: 100vw;
            max-width: 100dvw;
            height: 100%;
            max-height: 100vh;
            max-height: 100dvh;
        }
        #wrapper {
            display: grid;
            grid-template-rows: auto 1fr;
            width: 100%;
            height: 100%;   
        }

        header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--sl-spacing-medium);
            box-shadow: var(--sl-shadow-small);
        }

        main {
            display: grid;
            grid-template-columns: 1fr;
            gap: var(--sl-spacing-small);
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        main:has(aside[open]) {
            grid-template-columns: auto 1fr;
        }

        #view {
            height: 100%;
            width: 100%;
            overflow: hidden;
        }

        aside:not([open]) {
            display: none;
        }

        #header-left {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: var(--sl-spacing-medium);
        }

        #header-center {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #header-right {
            display: flex;
            align-items: center;
            justify-content: flex-end;
        }

        #menu-toggle svg {
            width: 36x;
            height: 36px;
            fill: var(--sl-color-neutral-1000);
            cursor: pointer;
        }

        #app-logo {
            height: 36px;
            width: auto;
        }

        .offline-banner {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
        }

        .offline-banner sl-alert {
            margin: 0;
            border-radius: 0;
        }

        .initializing, .syncing {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            background: var(--sl-color-neutral-50);
        }

        .initializing ubh-busy, .syncing ubh-busy {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
    `;

    static styles = [resetStyles, UbhShell.componentStyles]
}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-shell": UbhShell;
    }
}