import { IRoom, IUser } from "@model/data-model";
import { SlSwitch } from "@shoelace-style/shoelace";
import { css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { IListCard } from "../base/ILIstCard";
import UbhComponent from "../base/ubh-component";
import "../common/ubh-busy";
import UbhBusy from "../common/ubh-busy";
import { resetStyles } from "../css/reset.css";
import { IRoomInfo } from "../centers/IRoomInfo";
import { EVT_LIST_ITEM_SELECTED } from "../base/ubh-list";
import { uploadOutlineIcon } from "../common/icons";
import { canWriteRooms } from "../../application/utils/permissions-fns";

@customElement('ubh-room-status-card')
export class UbhRoomStatusCard extends UbhComponent implements IListCard<IRoomInfo> {
    @query('ubh-busy')
    private busy!: UbhBusy;
    @query('sl-switch')
    private switch!: SlSwitch;

    @property({ type: Boolean })
    selected: boolean = false;
    @property({ type: Boolean })
    selectable: boolean = true;

    @property({ type: Object })
    value: IRoomInfo | undefined;

    equals(other: IListCard<IRoom>): boolean {
        return this.value?.id === other.value?.id;
    }

    async updateValue() {
        if (!this.value) {
            return;
        }

        this.ctx.db.rooms
            .get(this.value.id)
            .then((room) => {
                this.value = room;
                this.requestUpdate();
            });
    }

    /*
     * Tratar evento de cambio de estado de limpieza.
     * Se guarda la habitación con el estado actualizado en la BD local
     * y se envía la modificación al servidor.
     */
    private async handleStateChange(_event: Event) {
        if (!(this.value && this.switch)) return;

        // Ejecución diferida para 'feedback' del usuario.
        this.busy.show();
        setTimeout(async () => {
            const room = this.value as IRoom;
            room.clean = this.switch.checked ? true : false;

            // Detener sincronización periódica para evitar conflictos
            this.ctx.synchronizer.stopPeriodicTask();

            try {
                const updateOk = await this.ctx.api.sendRoomStatus(room);
                room.syncStatus = updateOk ? 'synced' : 'pending';
                await this.ctx.db.rooms.update(room.id, room);
            } catch (error) {
                console.error('Error al actualizar el estado de la habitación:', error);
            } finally {
                // Reiniciar sincronización periódica
                this.ctx.synchronizer.startPeriodicTask();
                await this.updateValue();
                this.busy.hide();
            }
        }, 500);
    }

    private handleCardClick(event: Event) {
        // Evitar evento de selección si el control es el conmutador
        // de estado de limpieza.
        if (event.target instanceof SlSwitch) {
            event.stopPropagation();
            return;
        }

        if (this.selectable) {
            this.selected = true;
            this.dispatchEvent(new CustomEvent(EVT_LIST_ITEM_SELECTED, { bubbles: true, composed: true, detail: this.value }));
        }
    }

    /* Visualizar */
    protected render() {
        if (!this.value) return nothing;

        return html`
            <div id="wrapper" @click=${this.handleCardClick}>
                <header>
                    <label>${this.value.center.name}</label>
                    <div id="sync-status" >${this.value.syncStatus === 'pending' ? uploadOutlineIcon : nothing}</div>
                </header>
                <div id="sections">
                    <section id="left">
                        ${this.renderField('Bloque', this.value.block?.name)}
                        ${this.renderField('Planta', this.value.floor?.name)}
                        ${this.renderField('Rango', this.value.range?.name)}
                        <div class="tags">
                            ${this.renderTasksTag()}
                            ${this.renderReservationsTag()}
                        </div>
                    </section>
                    <section id="right">
                        ${this.renderField('Número', this.value.number, true)}
                        ${this.renderStatusControl()}
                    </section>
                </div>
            </div>
            <ubh-busy></ubh-busy>
        `;
    }

    private renderStatusControl() {
        if (canWriteRooms(this.ctx.currentUser as IUser)) {
            return html`
                <sl-switch ?checked=${this.value?.clean} ?disabled=${!canWriteRooms(this.ctx.currentUser as IUser)}
                    @sl-change=${this.handleStateChange}>
                    ${this.value?.clean ? 'LIMPIA' : 'SUCIA'}
                </sl-switch>            
            `;
        };

        return html`
            <span id="clean-status" class="${this.value?.clean ? 'clean' : 'dirty'}">${this.value?.clean ? 'LIMPIA' : 'SUCIA'}</span>        
        `;
    }


    private renderTasksTag() {
        if ((this.value?.pendingTasksCount ?? 0) <= 0) {
            return nothing;
        }

        const text = this.value?.pendingTasksCount === 1
            ? '1 Tarea pendiente'
            : `${this.value?.pendingTasksCount ?? ''} Tareas pendientes`
            ;

        return html`
            <sl-badge size="small" pill variant="warning">${text}</sl-badge>
        `;
    }

    private renderReservationsTag() {
        let text = undefined;
        let pillVariant: "primary" | "success" | "neutral" | "warning" | "danger" = 'danger';

        if ((this.value?.arrivalsCount ?? 0) > 0 && (this.value?.departuresCount ?? 0) > 0) {
            text = "Entrada y salida";
        }

        if ((this.value?.arrivalsCount ?? 0) > 0 && (this.value?.departuresCount ?? 0) <= 0) {
            text = "Entrada";
        }

        if ((this.value?.arrivalsCount ?? 0) <= 0 && (this.value?.departuresCount ?? 0) > 0) {
            text = "Salida";
        }

        if (!text) {
            text = this.value?.isOccupied ? "Ocupada" : "Libre";
            pillVariant = this.value?.isOccupied ? 'success' : 'neutral';
        }

        return html`
            <sl-badge size="small" pill variant="${pillVariant}">${text}</sl-badge>
        `;
    }


    /* Visualizar campo con etiqueta */
    private renderField(label: string, fieldValue: any, isRoomNumber: boolean = false) {
        return html`
            <div class="field">
                <label>${label}: </label>
                <span class="${isRoomNumber ? 'room-number' : ''}">${fieldValue ?? '?'}</span>
            </div>
        `
    }

    // Estilos CSS específicos de este componente
    static componentStyles = css`
        :host {
            font-size: var(--sl-font-size-small);
            cursor: pointer;
        }

        #wrapper, #sections, section {
            width: 100%;
        }

        #wrapper {
            background-color: var(--sl-color-neutral-0);
            border: 1px solid var(--sl-color-neutral-200);
            border-radius: var(--sl-border-radius-medium);           
            padding: var(--sl-spacing-x-small);            
        }

        #wrapper:hover {
            background-color: var(--sl-color-primary-100);
        }

        #wrapper.selected {
            background-color: var(--sl-color-primary-200);
        }

        header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        #sync-status svg {
            fill: var(--sl-color-danger-700);
        }

        #sections {
            display: flex;
            justify-content: space-between;
            gap: var(--sl-spacing-x-small);
        }

        section {
            display: flex;
            flex-direction: column;
        }

        #right {
            align-items: flex-end;
            gap: var(--sl-spacing-2x-small);
        }

        label {
            font-weight: bold;
        }

        .room-number {
            font-size: var(--sl-font-size-large);   
        }

        sl-switch::part(label)
        , #clean-status.dirty {
            color: var(--sl-color-danger-700);
        }

        sl-switch[checked]::part(label),
         #clean-status.clean {
            color: var(--sl-color-success-700);
        }


        sl-button[name="show-tasks"] {
            margin-top: var(--sl-spacing-x-small);
        }

        .tags {
            display: flex;
            gap: var(--sl-spacing-x-small);
            margin-top: var(--sl-spacing-x-small);
        }
        
    `;

    static styles = [resetStyles, UbhRoomStatusCard.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-room-status-card': UbhRoomStatusCard
    }
}