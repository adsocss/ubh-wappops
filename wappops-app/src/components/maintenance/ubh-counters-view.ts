import { css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import UbhComponent from "../base/ubh-component";
import "../base/ubh-view";
import { panelsStyles } from "../css/panels.css";
import { resetStyles } from "../css/reset.css";
import { ICountersListSettings } from "./ICountersListSettings";
import "./ubh-counter-form";
import UbhCounterForm from "./ubh-counter-form";
import "./ubh-counters-list";
import UbhCountersList, { CountersListItem } from "./ubh-counters-list";
import "./ubh-counters-list-settings";

@customElement('ubh-counters-view')
export default class UBHCountersView extends UbhComponent {
    @query('ubh-counters-list')
    private list?: UbhCountersList;
    @query('ubh-counter-form')
    private form?: UbhCounterForm;

    @state()
    private listSettings: ICountersListSettings | undefined;
    @state()
    private selectedCounter: CountersListItem | undefined;
    @state()
    private selectedPending: CountersListItem | undefined;

    /* Tratar evento de selección de un contador */
    private handleCounterSelected(event: CustomEvent) {
        this.form?.close();
        if (!this.form?.changed) {
            this.selectedCounter = { ...event.detail } as CountersListItem;
        } else {
            this.selectedPending = { ...event.detail } as CountersListItem;
        }
    }

    /* Tratar evento de recarga de la lista */
    private handleListReload(_event: Event) {
        this.selectedCounter = undefined;
    }

    /* Tratar evento de guardar del formulario (cuando se guarda) */
    private handleFormSaved(event: CustomEvent) {
        if (event.target instanceof UbhCounterForm && event.detail) {
            this.list?.updateItem(event.detail as CountersListItem);
        }
    }

    /* Tratar evento de cierre del formulario */
    private handleFormClosed(_event: Event) {
        if (this.selectedPending) {
            this.selectedCounter = { ...this.selectedPending };
            this.selectedPending = undefined;
        }
    }

    /* Actualizar los parámetros de configuración de la lista */
    private updateListSettings(event: CustomEvent) {
        this.listSettings = { ...event.detail as ICountersListSettings };
        if (this.list) {
            this.list.settings = { ...this.listSettings }
            this.selectedCounter = undefined;
            this.list.reload();
        }
    }

    /* Visualizar vista */
    protected render() {
        return html`
            <ubh-view>
                <ubh-counters-list slot="list" label="Contadores"
                    searchbox="top"
                    .canAdd=${false}
                    .hasSettings=${true}
                    @ubh-list-item-selected=${this.handleCounterSelected}
                    @ubh-list-reload=${this.handleListReload}
                ></ubh-counters-list>
                <div slot="details" style="height: 100%;">${this.renderForm()}</div>
                <aside slot="settings">
                    <ubh-counters-list-settings @ubh-list-settings-changed=${this.updateListSettings}>
                    </ubh-counters-list-settings>
                </aside>
            </ubh-view>
        `;
    }

    private renderForm() {
        if (!this.selectedCounter) {
            return html`
                <span class="no-selection">Seleccione contador</span>
            `;
        };

        return html`
            <ubh-counter-form
                 @ubh-close-details=${this.handleFormClosed}
                 @ubh-form-saved=${this.handleFormSaved}
                .item=${this.selectedCounter}>
            </ubh-counter-form>
        `;
    }


    static componentStyles = css`
        :host {
            width: 100%;
            height: 100%;
    `;


    static styles = [resetStyles, panelsStyles, UBHCountersView.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-counters-view': UBHCountersView;
    }
}