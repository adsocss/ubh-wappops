import { IRoom } from "@model/data-model";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import UbhComponent from "../base/ubh-component";
import { inputsStyles } from "../css/inputs.css";
import { resetStyles } from "../css/reset.css";

@customElement('ubh-room-info')
export default class UbhRoomInfo extends UbhComponent {
    @property({ type: Object })
    value?: IRoom;

    protected render() {
        if (!this.value) {
            return nothing;
        }

        return html`
            <sl-input label="Nº" value=${this.value.number} disabled size="small"></sl-input>
            <sl-input label="Tipo" value=${this.value.typeName} disabled size="small"></sl-input>
            <sl-input label="Bloque" value=${this.value.block?.name ?? '?'} disabled size="small"></sl-input>
            <sl-input label="Planta" value=${this.value.floor?.name ?? '?'} disabled size="small"></sl-input>
            <sl-input label="Rango" value=${this.value.range?.name ?? '?'} disabled size="small"></sl-input>
    `;
    }

    static componentStyles = css`
        :host {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--sl-spacing-small);
        }
    `;

    static styles = [resetStyles, inputsStyles, UbhRoomInfo.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-room-info': UbhRoomInfo
    }
}