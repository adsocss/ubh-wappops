import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { CountersListItem } from "./ubh-counters-list";
import { resetStyles } from "../css/reset.css";
import { ICounterRecord } from "@model/data-model";
import { uploadOutlineIcon } from "../common/icons";

@customElement('ubh-counter-records-list')
export default class UBHCounterRecordslist extends LitElement {
    @property({ type: Object })
    item!: CountersListItem | undefined;
    @property({ type: Number })
    lines?: number; ;

    constructor() {
        super();
        this.lines = 10;
    }

    protected render() {
       return html`
            <table>
                <caption>${this.getTitle()}</caption>
                <thead>
                    <tr>
                        <th style="text-align: center;">Fecha</th>
                        <th style="text-align: right;">Lectura</th>
                        <th style="text-align: center;">Consumo</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${this.getRecordsToDisplay().map(record => this.mapRecord(record))}
                </tbody>
            </table>
        `;
    }

    private getTitle() {
        if (this.lines  === 1) {
            return 'Última lectura';
        }

        return 'Últimas lecturas';
    }

    private mapRecord(record: ICounterRecord) {
        return html`
            <tr>
                <td style="text-align: center;">${record.date.toLocaleDateString()}</td>
                <td style="text-align: right;">${this.formatValue(record.value, record.counter.unitOfMeasure)}</td>
                <td style="text-align: center;">${record.isConsumption ? 'Sí' : 'No'}</td>
                <td id="sync-status">${record.syncStatus === 'pending' ? uploadOutlineIcon : nothing}</td>
            </tr>
        `;
    }

    private getRecordsToDisplay() {
        return Array.from(this.item?.records ?? []).reverse().slice(0, this.lines).reverse();
    }

    private formatValue(value: number, units: string | undefined = undefined) {
        const valueString = (value ?? 0.00).toLocaleString(navigator.language, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        return `${valueString} ${units ?? 'Un.'}`;
    }

    // Estilos CSS específicos de este componente.
    static componentStyles = css`
        :host {
            width: 100%;
            height: 100%;
            font-size: var(--sl-font-size-x-small);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: var(--sl-spacing-medium);
        }

        caption {
            font-size: var(--sl-font-size-small);
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: var(--sl-spacing-small);
        }

        tr {
            border-bottom: 1px solid var(--sl-color-neutral-200);
            height: var(--sl-spacing-medium);
        }

        #sync-status svg {
            width: 16px;
            height: 16px;
            fill: var(--sl-color-danger-700);
        }
    `;


    static styles = [resetStyles, UBHCounterRecordslist.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-counter-records-list': UBHCounterRecordslist;
    }
}