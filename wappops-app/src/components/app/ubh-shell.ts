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
    private syncIndicator!: UbhBusy;
    @query("#busy-indicator")
    private busyIndicator!: UbhBusy;
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
        this.autologin();
    }

    /* Determina si la vista a aplicar es para dispositivos móviles */
    private isMobile() {
        return isMobile();
    }

    /* Tratar evento de login y establecer la vista inicial */
    private async handleLogin(event: CustomEvent) {
        this.ctx.currentUser = event.detail as IUser;

        await this.updateComplete;
        this.busyIndicator.show();
        try {
            await this.ctx.synchronizer.syncAll();
            this.ctx.synchronizer.startPeriodicTask();
            this.ctx.notifications?.connect();
        } catch (error) {
            throw error;
        } finally {
            // Retardo para dar tiempo a que el componente esté construido
            await new Promise(r => setTimeout(r, 2000));

            await this.setDefaultView();
            this.busyIndicator.hide();
            this.requestUpdate();
        }
    }

    /*
     * Intentar login automático con la información de usuario
     * almacenada en localStorage.
     */
    private async autologin() {
        if (this.autoLoginDone) {
            return;
        }

        const storedUser = localStorage.getItem(USER_KEY);
        if (!storedUser) {
            return;
        }

        await this.updateComplete;

        // Reset de vista inicial
        this._currentView = undefined;
        window.location.hash = "";

        this.busyIndicator.show();
        try {
            await this.ctx.api.validateSession();
            this.autoLoginDone = true;
            await this.ctx.synchronizer.syncAll();
            this.ctx.synchronizer.startPeriodicTask();
            this.ctx.notifications?.connect();
        } catch (error) {
            // Si hay error, se asume que la sesión ha caducado
            this.logout();
        } finally {
            // Retardo para dar tiempo a que el componente esté construido
            await new Promise(r => setTimeout(r, 2000));
            this.requestUpdate();
            await this.setDefaultView();
            this.busyIndicator.hide();
        }
    }

    /* Establecer la vista inicial por defecto */
    // TODO: Establecer vista por defecto según permisos del usuario
    private async setDefaultView() {

        this.busyIndicator.show();

        // Retardo para dar tiempo a la sincronización inicial
        await new Promise(r => setTimeout(r, 5000));

        this.busyIndicator.hide();

        if (this.ctx.currentUser) {
            window.location.hash = "#/tasks";
        } else {
            window.location.hash = "#/login";
        }
    }

    /* Cerrar sesión */
    private logout() {
        this.ctx.notifications?.disconnect();
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
        let template: TemplateResult | undefined = undefined
        if (!this.ctx.currentUser) {
            template = this.renderLogin();
        } else {
            if (this.syncDone) {
                template = this.renderMain();
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
        return html`<ubh-login @ubh-login=${this.handleLogin}></ubh-login>`;
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
    `;

    static styles = [resetStyles, UbhShell.componentStyles]
}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-shell": UbhShell;
    }
}