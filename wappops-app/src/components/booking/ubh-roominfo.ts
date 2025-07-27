import { IRoom } from "@model/data-model";
import { css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import UbhComponent from "../base/ubh-component";
import { iconStyles } from "../css/icons.css";
import { inputsStyles } from "../css/inputs.css";
import { panelsStyles } from "../css/panels.css";
import { resetStyles } from "../css/reset.css";


@customElement('ubh-roominfo')
export class UbhRoomInfo extends UbhComponent {
    @state()
    private _room?: IRoom; 
    
    @property({ type: Object })
    set room(value: IRoom | undefined) {
        this._room = value;
    }
    get room(): IRoom | undefined {
        return this._room;
    }

    protected render() {
        return html`
            <section class="form-section">
                <div class="row-2-col">
                    <sl-input label="Bloque" size="small" disabled
                        value=${this.room?.block?.name ?? ''} 
                    ></sl-input>
                    <sl-input label="Planta" size="small" disabled
                        value=${this.room?.block?.name ?? ''} 
                    ></sl-input>
                </div>
                <div class="row-2-col"> 
                    <sl-input label="Habitación" size="small" disabled
                        value=${this.room?.number ?? ''}
                    ></sl-input>
                    <sl-input label="Tipo" size="small" disabled
                        value=${this.room?.typeName ?? ''}
                    ></sl-input>
                </div>
                <sl-input label="Rango" size="small" disabled
                        value=${this.room?.range?.name ?? ''}
                 ></sl-input>
                <ubh-reservations-list label="Reservas" toolbar="desktop"
                    .room=${this.room as any}
                ></ubh-reservations-list>
            </section>

        `;
    }


    // Estilos CSS específicos de este componente.
    static componentStyles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
        }

        .row-2-col {
            display: grid;
            grid-template-columns: auto auto;
            gap: var(--sl-spacing-small);
            width: 100%;
        }
        `;

    static styles = [
        resetStyles, iconStyles, inputsStyles, panelsStyles,
        UbhRoomInfo.componentStyles
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-roominfo": UbhRoomInfo;
    }
}