import { IResourceCounter } from "@model/data-model";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { IListCard } from "../base/ILIstCard";
import UbhComponent from "../base/ubh-component";
import { EVT_LIST_ITEM_SELECTED } from "../base/ubh-list";
import { uploadOutlineIcon } from "../common/icons";
import { resetStyles } from "../css/reset.css";
import { CountersListItem } from "./ubh-counters-list";

@customElement('ubh-counter-card')
export default class UbhCounterCard extends UbhComponent implements IListCard<CountersListItem> {
    @property({ type: Boolean })
    selected: boolean = false;
    @property({ type: Boolean })
    selectable: boolean = true;
    @property({ type: Object })
    value: CountersListItem | undefined;

    equals(other: IListCard<CountersListItem>): boolean {
        return this.value?.counter.id === other.value?.counter.id;
    }

    updateValue(): void {
        this.ctx.db.counters
            .get(this.value?.counter.id)
            .then(async (counter) => {
                const records = await this.ctx.db.countersRecords
                    .filter((record) => record.counter.id === counter?.id)
                    .toArray();

                this.value = {
                    counter: counter as IResourceCounter,
                    records: records
                }
            })
            .then(() => this.requestUpdate());
        ;
    }

    /* Determina si todas las lecturas del contador están sincronizadas */
    private isSynchronized(): boolean {
        return (this.value?.records ?? []).filter(record => record.syncStatus === 'pending').length === 0;
    }

    /* Tratar evento de selección */
    private handleClick(_event: Event) {
        if (this.selectable) {
            this.selected = true;
            this.dispatchEvent(new CustomEvent(EVT_LIST_ITEM_SELECTED, { bubbles: true, composed: true, detail: this.value }));
        }
    }

    /* Visualizar */
    protected render() {
        if (!this.value) {
            return nothing;
        }

        return html`
            <div id="wrapper" @click=${this.handleClick} class="${this.selected ? 'selected' : ''} ${this.selectable ? 'selectable' : ''}">
                <header>
                    <span>${this.value.counter.center.name}</span>
                    <div id="sync-status">${this.isSynchronized() ? nothing : uploadOutlineIcon}</div>
                </header>
                <main>
                    <span>${this.value.counter.name}</span>
                    <div id="last-record">${this.renderLastRecord()}</div>
                </main>
            </div>
        `;
    }

    private renderLastRecord() {
        const lastRecord = this.value?.records[this.value.records.length - 1];

        if (!lastRecord?.date) {
            return html`
                <span>Sin lecturas</span>
            `;
        }

        const formattedValue = (lastRecord.value ?? 0.00).toLocaleString(navigator.language, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });


        return html`
            <span>Última lectura: ${lastRecord.date.toLocaleDateString()}</span>
            <span>${formattedValue} ${ this.value?.counter.unitOfMeasure ?? 'Uds.'}</span>
        `;
    }

    static componentStyles = css`
        :host {
            font-size: var(--sl-font-size-small);
            cursor: pointer;
        }

        #wrapper {
            display: flex;
            flex-direction: column;
            gap: var(--sl-spacing-x-small);            
            padding: var(--sl-spacing-small);
            border: 1px solid var(--sl-color-neutral-200);
            border-radius: var(--sl-border-radius-medium);            
            background-color: var(--sl-color-neutral-0);
            width: 100%;
        }

        #wrapper:hover {
            background-color: var(--sl-color-primary-100);
        }

        #wrapper.selected {
            background-color: var(--sl-color-primary-200);
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
        }

        #sync-status svg {
            fill: var(--sl-color-danger-700);
            width: 1.5em;
            height: 1.5em;
        }

        #last-record {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 80%;
        }
        `;

    static styles = [resetStyles, UbhCounterCard.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-counter-card': UbhCounterCard;
    }
}