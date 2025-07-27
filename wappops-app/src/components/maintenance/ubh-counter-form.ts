import { IClosable } from "../base/IClosable";
import { EVT_CLOSE_DETAILS, EVT_DATA_CHANGED } from "../base/ubh-view";
import { ICounterRecord } from "@model/data-model";
import { SlCheckbox, SlDialog, SlInput } from "@shoelace-style/shoelace";
import { css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { toLocalISOString } from "../../application/utils/datetimeutils";
import UbhComponent from "../base/ubh-component";
import "../base/ubh-form";
import { EVT_FORM_SAVED } from "../base/ubh-form";
import { backOutlineIcon, saveIcon } from "../common/icons";
import "../common/ubh-busy";
import UbhBusy from "../common/ubh-busy";
import { iconStyles } from "../css/icons.css";
import { inputsStyles } from "../css/inputs.css";
import { panelsStyles } from "../css/panels.css";
import { resetStyles } from "../css/reset.css";
import { saveRecord } from "./counters-fns";
import "./ubh-counter-records-list";
import UBHCounterRecordslist from "./ubh-counter-records-list";
import { CountersListItem } from "./ubh-counters-list";

@customElement('ubh-counter-form')
export default class UbhCounterForm extends UbhComponent implements IClosable {
    @query('ubh-counter-records-list')
    private recordsList!: UBHCounterRecordslist;
    @query('#close-dialog')
    private closeDialog!: SlDialog;
    @query('#error-dialog')
    private errorDialog!: SlDialog;
    @query('ubh-busy')
    private busy?: UbhBusy;


    private _item: CountersListItem | undefined = undefined;
    @property({ type: Object })
    set item(value: CountersListItem | undefined) {
        this._item = value;
        this.recordType = 'none';
        this.requestUpdate();
    }

    get item(): CountersListItem | undefined {
        return this._item;
    }

    @state()
    private recordType: 'none' | 'new' | 'correction' = 'none';
    @state()
    private currentRecord: Partial<ICounterRecord> | undefined = undefined;

    @state()
    private _changed: boolean = false;
    @state()
    private validationError: string | undefined = undefined;

    close(): void {
        if (this._changed) {
            this.closeDialog.show();
            return;
        }

        this.reset();
        this.closeDialog.hide();
        this.dispatchEvent(new CustomEvent(EVT_CLOSE_DETAILS, { bubbles: true, composed: true }));
    }

    get changed(): boolean {
        return this._changed;
    }

    isValid(): boolean {
        return true;
    }

    private reset() {
        this.recordType = 'none';
        this.currentRecord = undefined;
        this._changed = false;
        this.recordsList.lines = 10;
        this.recordsList.requestUpdate();
        this.requestUpdate();
    }

    private saveChanges() {

        this.busy?.show();

        this.validationError = undefined;
        saveRecord(this.ctx, this.currentRecord as ICounterRecord)
            .then((record) => {
                this.item?.records.push(record);
            })
            .then(() => this.reset())
            .then(() => {
                // Disparar evento de cambio para notificar que se ha guardado la tarea
                this.dispatchEvent(new CustomEvent(EVT_FORM_SAVED, { bubbles: true, composed: true, detail: this._item }));
                // Evento general de cambio de datos. Sin detalle, para indicar que los datos se han guardado.
                this.dispatchEvent(new CustomEvent(EVT_DATA_CHANGED, { bubbles: true, composed: true }));
            })
            .catch((error) => {
                this.validationError = (error as Error).message;
                this.errorDialog.show();
            })
            .finally(() => this.busy?.hide());
    }

    private discardChanges() {
        this.reset();
        this.close();
    }

    private handleChanges(event: Event) {
        const fieldname = (event.target as HTMLInputElement).name;
        if (!fieldname) {
            return;
        }
        if (fieldname === 'reset') {
            this.currentRecord = {
                ...this.currentRecord,
                reset: (event.target as SlCheckbox).checked
            };
        }
        if (fieldname === 'value') {
            this.currentRecord = {
                ...this.currentRecord,
                value: parseFloat((event.target as SlInput).value)
            };
        }
        if (fieldname === 'date') {
            this.currentRecord = {
                ...this.currentRecord,
                date: new Date((event.target as SlInput).value)
            };
        }
        if (fieldname === 'remarks') {
            this.currentRecord = {
                ...this.currentRecord,
                remarks: (event.target as any).value
            };
        }

        this._changed = true;
    }

    protected render() {
        return html`
            <ubh-form 
                @change=${this.handleChanges}
                @sl-change=${this.handleChanges}
            >
                <div slot="header">${this.renderHeader()}</div>
                <ubh-counter-records-list slot="body" .item=${this.item}
                ></ubh-counter-records-list>
                ${this.renderActions()}
                ${this.renderRecordFields()}
            </ubh-form>
            <sl-dialog id="close-dialog" label="${this.item?.counter.name ?? '?'}">
                <p>Hay cambios sin guardar. ¿Desea descartarlos?</p>
                <sl-button slot="footer" @click=${this.discardChanges}>Descartar</sl-button>
                <sl-button slot="footer" variant="primary" @click=${this.saveChanges}>Guardar</sl-button>
            </sl-dialog>
             <ubh-busy></ubh-busy>
            <sl-dialog id="error-dialog" label="Error">
                ${this.validationError}
            </sl-dialog>

        `;
    }

    private renderHeader() {
        return html`
            <header>
                <div id="title">
                    ${this.isMobile()
                ? html`
                            <div class="icon-button toolbar"
                                @click=${this.close}
                            >${backOutlineIcon}</div>
                        `
                : nothing
            }
                    <span>${this.item?.counter.name}</span>
                </div>
                ${this._changed
                ? html`
                        <div id="save-button" class="icon-button mobile-tool" @click=${this.saveChanges} >${saveIcon}</div>
                    `
                : nothing
            }
            </header>
            <sl-divider></sl-divider>
        `;
    }

    private renderActions() {
        if (this.recordType !== 'none') {
            return nothing;
        }

        return html`
            <sl-button-group id="actions" slot="body">
                <sl-button id="new" size="small" variant="primary"
                    @click=${() => this.setRecordType('new')}
                >Nueva</sl-button>
                <sl-button id="correction" size="small" variant="primary" 
                    @click=${() => this.setRecordType('correction')}
                >Corrección</sl-button>
             </sl-button-group>
        `;
    }

    // Establecer el tipo de lectura e inicializar los valores
    private setRecordType(type: 'none' | 'new' | 'correction') {
        this.recordType = type;

        if (type === 'none') {
            this.currentRecord = undefined;
            this.recordsList.lines = 10;
            return;
        }

        this.recordsList.lines = this.isMobile() ? 1 : 10;

        this.currentRecord = {
            ...this.currentRecord,
            id: undefined,
            localId: undefined,
            date: new Date(),
            value: 0,
            reset: false,
            remarks: '',
            counter: this.item?.counter,
        };

        if (type === 'new') {
            return;
        }

        if (type === 'correction') {
            this.currentRecord = {
                ...this.currentRecord,
                reset: true,
                remarks: 'Corrección lecturas',
            };
        }
    }

    /* Visualizar formulario interno de lectura de contador */
    private renderRecordFields() {
        if (this.recordType === 'none' || this.currentRecord === undefined) {
            return nothing;
        }

        return html`
            <section id="record-fields" slot="body">
                <header id="record-form-header">
                    <span>${this.recordType === 'new' ? 'Nueva lectura' : 'Corrección'}</span>
                    <sl-button variant="primary" size="small" @click=${this.discardChanges}>Cancelar</sl-button>
                </header>
                <sl-divider></sl-divider>
                <sl-input name="date" type="datetime-local" label="Fecha" size="small" disabled
                    value=${toLocalISOString(this.currentRecord.date ?? new Date())} 
                ></sl-input>
                <div id="value">
                    <sl-input name="value" type="number" label="Lectura" size="small"
                        value=${(this.currentRecord.value ?? 0.00).toString()} 
                    ></sl-input>
                    ${this.recordType === 'correction'
                ? nothing
                : html`
                            <sl-checkbox name="reset" id="reset-checkbox" size="small"
                                ?checked=${this.currentRecord.reset}
                            >Recarga</sl-checkbox>
                        `
            }
                </div>
                <sl-textarea label="Observaciones" name="remarks" size="small"
                    value=${this.currentRecord.remarks ?? ''}
                >
                </sl-textarea>
            </section>
        `;
    }


    // Estilos CSS específicos de este componente
    static componentStyles = css`
        :host {
            display: flex;
            flex-direction: column;
            gap: var(--sl-spacing-x-small);
            width: 100%;
            height: 100%;
        }

        #title {
            display: flex;
            align-items: center;
            gap: var(--sl-spacing-x-small);
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        #save-button svg {
            width: 32px;
            height: 32px;
            fill: var(--sl-color-danger-500);
        }

        #record-fields {
            display: flex;
            flex-direction: column;
            margin-top: var(--sl-spacing-medium);
        }

        #actions {
            margin-top: var(--sl-spacing-medium);
        }

        #value {
            display: flex;
            align-items: center;
            gap: var(--sl-spacing-x-small); 
        }

        #reset-checkbox {
            margin-top: var(--sl-spacing-small);
        }

        sl-dialog::part(body) {
            display: flex;
            flex-direction: column;
            gap: var(--sl-spacing-small)
        }       

        sl-dialog::part(footer) {
            display: flex;
            justify-content: space-between;
        }
    `;

    static styles = [resetStyles, panelsStyles,
        inputsStyles, iconStyles,
        UbhCounterForm.componentStyles
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-counter-form': UbhCounterForm;
    }
}
