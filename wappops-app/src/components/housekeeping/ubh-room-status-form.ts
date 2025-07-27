import { IRoom } from "@model/data-model";
import { SlTabGroup } from "@shoelace-style/shoelace";
import { css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { IClosable } from "../base/IClosable";
import UbhComponent from "../base/ubh-component";
import { EVT_CLOSE_DETAILS } from "../base/ubh-view";
import { backOutlineIcon, roomOutlineIcon, tasksOutlineIcon } from "../common/icons";
import { iconStyles } from "../css/icons.css";
import { inputsStyles } from "../css/inputs.css";
import { panelsStyles } from "../css/panels.css";
import { resetStyles } from "../css/reset.css";
import "./ubh-room-status-task-list";
import "../booking/ubh-roominfo"
import { UbhRoomStatusTaskList } from "./ubh-room-status-task-list";
import { UbhRoomInfo } from "../booking/ubh-roominfo";

@customElement('ubh-room-status-form')
export default class UbhRoomStatusForm extends UbhComponent implements IClosable {
    @query('sl-tab-group')
    private tabGroup!: SlTabGroup;
    @query('ubh-room-status-task-list')
    private taskList!: UbhRoomStatusTaskList;
    @query('ubh-roominfo')
    private roomInfo!: UbhRoomInfo;
    
    hasChanged(): boolean {
        // Nunca hay cambios que guardar en este formulario
        return false;
    }
    
    isValid(): boolean {
        return true;
    }
    
    @property({ type: Object })
    room?: IRoom | undefined;

    public set currentRoom(room: IRoom | undefined) {
        this.room = room ? {...room} : undefined;
        if (this.taskList) {
            this.taskList.room = room;
            this.taskList.reload();
        }

        if (this.roomInfo) {
            this.roomInfo.room = room;
        }

        this.tabGroup?.show('main');

        this.requestUpdate();
    }

    public close(): void {
        this.dispatchEvent(new Event(EVT_CLOSE_DETAILS, { bubbles: true, composed: true }));
    }

    /* Visualizar */
    protected render() {
        return html`
            <div id="wrapper">
                <header>${this.renderHeader()}</header>
                <section id="body">${this.renderBody()}</section>
            </div>
            `;
    }

    /* Visualizar la cabecera del formulario */
    protected renderHeader() {
        return html`
            <div class="header">
                <section class="header-left">
                    ${!this.isMobile()
                    ? nothing
                    : html`<div @click="${this.close}" class="icon-button toolbar">${backOutlineIcon}</div>    `
                    }
                    <h3>Hab. Nº ${this.room?.number ?? '?'}</h3>
                </section>
            </div>           
            <sl-divider></sl-divider>
        `;
    }

    /* Visualizar el cuerpo del formulario */
    protected renderBody() {
        if (!this.room) {
            return html`<span class="no-selection">Seleccione una habitación</span>`;
        }

        return html`
            <sl-tab-group placement="${this.isMobile() ? 'bottom' : 'top'}">
                ${this.renderRoomTab()}
                <sl-tab-panel name="main" active>
                    ${this.renderRoomPanel()}
                </sl-tab-panel>
                ${this.renderTasksTab()}
                <sl-tab-panel name="track">
                    ${this.renderTasksPanel()}
                </sl-tab-panel>
            </sl-tab-group>
        `;
    }

    private renderRoomTab() {
        if (!this.isMobile()) {
            return html`
                <sl-tab slot="nav" panel="main">Habitación</sl-tab>
            `;
        }

        return html`
            <sl-tab slot="nav" panel="main">
                <div class="icon-button">${roomOutlineIcon}</div>
            </sl-tab>
        `;
    }

    private renderTasksTab() {
        if (!this.isMobile()) {
            return html`
                <sl-tab slot="nav" panel="track">Tareas</sl-tab>
            `;
        }

        return html`
            <sl-tab slot="nav" panel="track">
                <div class="icon-button">${tasksOutlineIcon}</div>
            </sl-tab>
        `;
    }

    /* Visualizar información de la habitación */
    private renderRoomPanel() {
        if (!this.room) return this.renderNoRoomSelected();

        return html`
            <ubh-roominfo .room=${this.room}></ubh-roominfo>
        `;
    }

    /* Visualizar información de tareas pendientes */
    private renderTasksPanel() {
        if (!this.room) return this.renderNoRoomSelected();
        return html`
            <ubh-room-status-task-list label="Tareas pendientes"  style="font-size: 80%;"
                .room=${this.room} .canAdd=${false} .canReload=${false} .canSearch=${false}
            ></ubh-room-status-task-list>
        `;
    }

    private renderNoRoomSelected() {
        return html`
            <div class="noroom">
                <h1>Seleccione habitación</h1>
            </div>
        `;
    }


    // Estilos CSS específicos de este componente
    static componentStyles = css`
        #wrapper {
            display: grid;
            grid-template-rows: auto 1fr auto;
            width: 100%;
            height: 100%;
            background-color: var(--sl-color-neutral-0);
        }

        #body {
            width: 100%;
            height: 100%;
        }

        ubh-room-status-task-list {
            width: 100%;
            height: 100%;
        }

        #room-tab {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.5rem;
        }

        sl-input::part(form-control), sl-input::part(input) {
            width: 100%;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
        }

        .header-left {
            display: flex;
            align-items: center;
        }

        .header svg {
            height: 36px;
            width: 36px;
            fill: var(--sl-color-primary-600);
        }

        .noroom {
            text-align: center;
            color: var(--sl-color-neutral-400);
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-gap: 1rem;
            width: 100%;
        }
       

        sl-tab svg {
            height: 36px;
            width: 36px;
            fill: var(--sl-color-primary-600);
        }
        `;

    static styles = [resetStyles, panelsStyles, iconStyles, inputsStyles, UbhRoomStatusForm.componentStyles]
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-room-status-form': UbhRoomStatusForm;
    }
}