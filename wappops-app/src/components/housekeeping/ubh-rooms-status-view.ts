import { IRoom } from "@model/data-model";
import { css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import UbhComponent from "../base/ubh-component";
import "../common/ubh-busy";
import { resetStyles } from "../css/reset.css";
import { IRoomInfo } from "../centers/IRoomInfo";
import { IRoomStatusListSettings } from "./IRoomStatusListSettings";
import UBHRoomStatusForm from "./ubh-room-status-form";
import "./ubh-rooms-status-list";
import { UbhRoomsStatusList } from "./ubh-rooms-status-list";
import "./ubh-rooms-status-list-settings";
import "./ubh-room-status-form";


@customElement('ubh-rooms-status-view')
export class UbhRoomsStatusView extends UbhComponent {
    @query('ubh-rooms-status-list')
    private list!: UbhRoomsStatusList;
    @query('ubh-room-status-form')
    private form!: UBHRoomStatusForm;

    @state()
    private listSettings: IRoomStatusListSettings | undefined;
    @state()
    private currentRoom: IRoomInfo | undefined = undefined;


    private handleRoomSelected(event: CustomEvent) {
        if (event.target instanceof UbhRoomsStatusList) {
            this.setCurrentRoom(event.detail as IRoomInfo);
        }
    }

    private setCurrentRoom(room: IRoom | undefined) {
        this.currentRoom = room;
        // TODO: averiguar por qué el form no se
        // actualiza sin necesidad de hacer ésto 
        // (¿por estar en un slot?)
        if (this.form) {
            this.form.currentRoom = room;
        }
        this.requestUpdate();
    }

    private handleSettingsChanged(event: Event) {
        if (event.target instanceof UbhRoomsStatusList) {
            this.setCurrentRoom(undefined);
        }
    }

    /* Actualizar los parámetros de configuración de la lista */
    private updateListSettings(event: CustomEvent) {
        this.listSettings = { ...event.detail as IRoomStatusListSettings };
        if (this.list) {
            this.list.settings = { ...this.listSettings }
            this.list.reload();
        }
    }

    /* Visualizar */
    protected render() {
        return html`
        <ubh-view>
            <ubh-rooms-status-list slot="list" label="Estados de habitaciones"
                @ubh-list-item-selected="${this.handleRoomSelected}"
                @settings-changed="${this.handleSettingsChanged}"
                searchbox="top"
                .canAdd=${false}
                ?hassettings=${true}
            ></ubh-rooms-status-list>
            <ubh-room-status-form slot="details"
                .room=${this.currentRoom}
            ></ubh-room-status-form>
            <aside slot="settings">
                <ubh-rooms-status-list-settings @ubh-list-settings-changed=${this.updateListSettings}>
                </ubh-rooms-status-list-settings>
            </aside>
        </ubh-view>
        <ubh-busy></ubh-busy>
        `;
    }

    // Estilos CSS específicos de este componente
    static componentStyles = css`
        :host {
            width: 100%;
        }
    `;

    static styles = [resetStyles, UbhRoomsStatusView.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-rooms-status-view': UbhRoomsStatusView
    }
}