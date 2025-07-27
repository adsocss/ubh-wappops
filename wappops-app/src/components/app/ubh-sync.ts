import { SlButton } from "@shoelace-style/shoelace";
import { css, html, PropertyValues } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import UbhComponent from "../base/ubh-component";
import "../common/ubh-busy";
import UbhBusy from "../common/ubh-busy";
import { resetStyles } from "../css/reset.css";

@customElement("ubh-sync")
export default class UbhSync extends UbhComponent {
    @query('#sync-all-btn')
    private syncAllBtn?: SlButton;
    @query('#sync-pending-btn')
    private syncPendingBtn?: SlButton;
    @query('ubh-busy')
    private busyIndicator?: UbhBusy;

    @state()
    private serverStatus: string = "idle";
    @state()
    private pendingTasks: number = 0;
    @state()
    private pendingRoomsStatus: number = 0;
    @state()
    private pendingCountersRecords: number = 0;

    /* Sincronización total de datos */
    private async syncAll() {
        await this.sync('all');
    }

    /* Enviar solo datos pendientes al servidor */
    private async syncPending() {
        await this.sync('pending');
    }

    /* Método general de invocación de una operación de sincronización */
    private async sync(dataset: 'all' | 'pending') {
        this.busyIndicator!.show();

        // Retardo para feeback de usuario
        setTimeout(async () => {
            try {
                if (dataset === 'all') {
                    await this.ctx.synchronizer.syncAll();
                } else {
                    await this.ctx.synchronizer.syncPending(false);
                }

                await this.updateStatus();
                // Retardo para dar tiempo a que los datos del contexto se actualicen
                await new Promise(r => setTimeout(r, 2000));
                this.requestUpdate();
            } catch (error) {
                console.error("Error de sincronización:", error);
            } finally {
                this.busyIndicator!.hide();
            }
        }, 1000);
    }

    /* Desactiva los botones de sincronización */
    private disableActions() {
        this.syncAllBtn!.disabled = true;
        this.syncPendingBtn!.disabled = true;
        this.requestUpdate();
    }

    /*
     * Activa los botones de sincronización.
     * Solo habilita el botón de sincronización pendiente si hay datos
     * pendientes de envío al servidor.
     */
    private enableActions() {
        this.syncAllBtn!.disabled = false;
        const pendingCount = this.pendingTasks + this.pendingRoomsStatus + this.pendingCountersRecords;
        if (pendingCount > 0) {
            this.syncPendingBtn!.disabled = false;
        } else {
            this.syncPendingBtn!.disabled = true;
        }
        this.requestUpdate();
    }

    protected async updateStatus() {
        await this.ctx.db.getPendingTasks()
            .then((tasks) => this.pendingTasks = tasks.length)
            .then(() => this.ctx.db.getPendingCountersRecords())
            .then((records) => this.pendingCountersRecords = records.length)
            .then(() => this.ctx.db.getPendingRoomsStatus())
            .then((rooms) => this.pendingRoomsStatus = rooms.length)
            .then(() => this.enableActions())
            ;
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        this.updateStatus().then(() => this.requestUpdate());
    }

    protected render() {
        return this.renderContent();
    }

    private renderContent() {
        return html`
        <div id="wrapper">
            <header>
                <h3>Sincronización</h3>
            </header>
            <section id="body">
                <div class="row">
                    <label>Conexión del dispositivo</label>
                    <span id="network-status" class="${navigator.onLine ? 'connected' : ''}" >${navigator.onLine ? 'Conectado' : 'Sin conexión'}</span>
                </div>
                <!-- <div class="row">
                    <label>Estado del servidor</label>
                    <span>${this.serverStatus}</span>
                </div> -->
                <div class="row">
                    <label>Última sincronización</label>
                    <span>${this.ctx?.lastSync ? this.ctx.lastSync.toLocaleString() : 'Nunca'}</span>
                </div>
                <div class="row">
                    <label>Última actualización periódica</label>
                    <span>${this.ctx.synchronizer.lastUpdateTaskExecution ? this.ctx.synchronizer.lastUpdateTaskExecution.toLocaleString() : 'Nunca'}
                    </span>
                </div>

                <h4 slot="body" class="title">Envíos al servidor pendientes</h4>
                ${this.renderPendingItems('Tareas', this.pendingTasks)}
                <!-- ${this.renderPendingItems('Lecturas de contadores', this.pendingCountersRecords)} -->
                ${this.renderPendingItems('Estados de habitaciones', this.pendingRoomsStatus)}
                <div class="actions">
                    <sl-button id="sync-all-btn" @click=${this.syncAll} variant="primary" size="small">Sincronizar todo</sl-button>
                    <sl-button id="sync-pending-btn" @click=${this.syncPending} variant="primary" size="small">Sincronizar pendiente</sl-button>
                </div>
            </section>
        </div>
        <ubh-busy></ubh-busy>
        `;
    }

    private renderPendingItems(label: string, count: number) {
        return html`
            <div class="row">
                <label>${label}</label>
                <label>${count > 0 ? count : 'Nada pendiente'}</label>
            </div>
        `;
    }

    connectedCallback(): void {
        super.connectedCallback();
        // Eventos de conectividad de red
        window.addEventListener('offline', this.disableActions.bind(this));
        window.addEventListener('online', this.enableActions.bind(this));
    }

    disconnectedCallback(): void {
        // Desactiva monitores de eventos
        window.removeEventListener('offline', this.disableActions);
        window.removeEventListener('online', this.enableActions);
    }


    // Estilos CSS expecificos de este componente.
    static componentStyles = css`
        :host {
            display: flex;
            justify-content: center;
            width: 100%;
        }

        #wrapper {
            display: grid;
            grid-template-rows: auto 1fr auto;
            width: 100%;
            max-width: 40rem;
            padding: var(--sl-spacing-medium);
        }

        #body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding-top: var(--sl-spacing-medium); ;
            font-size: var(--sl-font-size-small);
        }

        header, .title {
            width: 100%;
            border-bottom: 2px solid var(--sl-color-neutral-200);
        }

        .title {
            margin-top: var(--sl-spacing-medium);
        }

        .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--sl-spacing-x-small);
            width: 100%;
        }

        #network-status {
            color: var(--sl-color-danger-600);
        }

        #network-status.connected {
            color: var(--sl-color-success-600);
        }

        .actions {
            display: flex;
            justify-content: space-between;
            width: 100%;
            padding-top: var(--sl-spacing-medium);
            border-top: 2px solid var(--sl-color-neutral-200);
        }
    `;

    static styles = [resetStyles, UbhSync.componentStyles]
}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-sync": UbhSync;
    }
}