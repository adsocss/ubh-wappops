import { css, html, nothing } from "lit";
import { IListCard } from "../base/ILIstCard";
import UbhComponent from "../base/ubh-component";
import { IReservation } from "@model/data-model";
import { customElement, property } from "lit/decorators.js";
import { formatDateTime, isToday } from "../../application/utils/datetimeutils";
import { resetStyles } from "../css/reset.css";

@customElement('ubh-reservation-card')
export default class UbhReservationCard extends UbhComponent implements IListCard<IReservation> {
    @property({ type: Boolean })
    selected: boolean = false;
    @property({ type: Boolean })
    selectable: boolean = true;
    @property({ type: Object })
    value: IReservation | undefined = undefined;

    equals(other: IListCard<IReservation>): boolean {
        return this.value?.id === other.value?.id;
    }

    public updateValue(): void {
        this.ctx.db.booking
            .get(this.value?.id)
            .then((reservation) => {
                this.value = reservation;
                this.requestUpdate();
            });
    }

    /* Visualizar */
    protected render() {
        if (!this.value) {
            return nothing;
        }

        const resNumber = `${this.value.numberSeries}-${this.value.number}-${this.value.roomIndex}`;
        return html`
            <div class="wrapper">
                <div class="row-2">
                    ${this.renderField("Nº reserva", resNumber)}
                    ${this.renderStatus()}
                </div>
                <div class="row-2">
                    ${this.renderField("Entrada", formatDateTime(this.value.arrival))}
                    ${this.renderField("Salida", formatDateTime(this.value.departure))}
                </div>
                <div class="row-2">
                    ${this.renderField("Tour Operador", this.value.ttoo.name ?? "")}
                    ${this.renderField("Agencia", this.value.agency.name ?? "")}
                </div>
                <div class="row-2">
                    ${this.renderField("Titular", this.value.holder ?? "")}
                    <div id="pax">
                        ${this.renderField("AD", this.value.adults)}
                        ${this.renderField("JR", this.value.juniors)}
                        ${this.renderField("NI", this.value.children)}
                        ${this.renderField("BB", this.value.babies)}
                    </div>
                </div>
            </div>
        `;
    }

    /* Método general de presebtción de campos */
    private renderField(label: string, value: any) {
        return html`
                <label class="field">${label}
                    <span>${value}</span>
                </label>

        `;
    }

    /**
     * Visualiza el estado de la reserva con la indicación expresa de si
     * se trata de una entrada o salida de la fecha actual y si el check-in o check-out
     * está pendiente.
     */
    private renderStatus() {
        if (!this.value) {
            return nothing;
        }

        let kind: string | undefined = undefined;
        let status: string | undefined = undefined;
        let variant: 'primary' | 'success' | 'neutral' | 'warning' | 'danger' = 'neutral';

        // Entrada de la fecha actual
        if (isToday(this.value.arrival)) {
            kind = 'Entrada';
            if (this.value.status === 'no-show') {
                status = 'No Show';
                variant = 'warning';
            } else {
                status = this.value.status !== 'check-in' ? 'Check-In pendiente' : undefined;
                variant = 'danger';
            }
        }

        // Salida de la fecha actual
        if (isToday(this.value.departure)) {
            kind = 'Salida';
            status = this.value.status !== 'check-out' ? 'Check-Out pendiente' : undefined;
            variant = 'danger';
        }

        // Estado de reserva
        if (!(isToday(this.value.arrival) || isToday(this.value.departure))) {
            switch (this.value.status) {
                case 'check-in':
                    kind = 'Check-In';
                    status = undefined;
                    break;
                case 'check-out':
                    kind = 'Check-Out';
                    status = undefined;
                    break;
                case 'confirmed':
                    kind = 'Confirmada';
                    status = undefined;
                    break;
                case 'new':
                    kind = 'Pendiente';
                    status = undefined;
                    break;
                default:
                    kind = undefined;
                    status = undefined;
                    break;
            }
        }

        if (!(kind || status)) {
            return nothing;
        }

        return html`
            <sl-badge pill variant="${variant}">
                ${kind ?? ''} ${status ? `(${status})` : ''}
            </sl-badge>
        `;
    }

    // Estilos CSS específicos de este componente.
    static componentStyles = css`
        :host {
            font-size: var(--sl-font-size-x-small);
            cursor: pointer;
        }
        .wrapper {
            display: flex;
            flex-direction: column;
            gap: var(--sl-spacing-x-small);            
            border: 1px solid var(--sl-color-neutral-200);
            border-radius: var(--sl-border-radius-medium);            
            padding: var(--sl-spacing-x-small);
        }

        sl-input::part(form-control), sl-input::part(input) {
            width: 100%;
        }

        .row-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: var(--sl-spacing-x-small);
            width: 100%;
        }
        .row-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: var(--sl-spacing-x-small);
            width: 100%;
        }

        #pax {
            display: flex;
            gap: var(--sl-spacing-x-small);
            width: 100%;
        }

        label.field {
            display: flex;
            flex-direction: column;
            font-weight: bold;
        }

        label.field span {
            font-weight: normal;
            margin-left: var(--sl-spacing-x-small);
        }
    `;

    static styles = [resetStyles, UbhReservationCard.componentStyles];


}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-reservation-card': UbhReservationCard;
    }
}