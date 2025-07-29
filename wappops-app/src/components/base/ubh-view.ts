import { SlDrawer } from "@shoelace-style/shoelace";
import { css, html } from "lit";
import { customElement, query } from "lit/decorators.js";
import "../common/ubh-busy";
import UbhBusy from "../common/ubh-busy";
import { panelsStyles } from "../css/panels.css";
import { resetStyles } from "../css/reset.css";
import { IClosable } from "./IClosable";
import UbhComponent from "./ubh-component";
import { EVT_LIST_ITEM_ADD, EVT_LIST_ITEM_SELECTED, EVT_LIST_SETTINGS, EVT_LIST_SETTINGS_CHANGED } from "./ubh-list";

/**
 * Evento de cambio de datos en la vista.
 * Se dispara/debe disparar cuando se actualizan los datos de algún elemento de la vista.
 */
export const EVT_DATA_CHANGED = 'ubh-data-changed';

/**
 * Evento de cierre del panel de detalles.
 */
export const EVT_CLOSE_DETAILS = 'ubh-close-details';

@customElement("ubh-view")
export default class UbhView extends UbhComponent implements IClosable {
    @query('#settings')
    settingsPanel?: SlDrawer;
    @query('#details')
    detailsPanel?: SlDrawer;
    @query('ubh-busy')
    busy?: UbhBusy;

    private dirtyElement?: IClosable


    /* Abrir el panel de configuración de la vista */
    private openSettings() {
        if (this.settingsPanel) {
            this.settingsPanel.show();
        }
    }

    /* Cerrar el panel de configuración de la vista */
    private closeSettings() {
        if (this.settingsPanel) {
            this.settingsPanel.hide();
        }
    }

    /* Abrir el panel de detalles de la vista */
    private openDetails() {
        console.log('[UbhView] Opening details panel');
        if (this.detailsPanel) {
            this.detailsPanel.show();
            
            // MOBILE: Ensure drawer opens properly
            if (this.isMobile()) {
                console.log('[UbhView] Mobile details panel opened');
            }
        }
    }

    /*
     * Tratar evento de modificación de datos en algún elemento de la vista
     * Si el evento contiene un detalle, se considera que hay un elemento con datos sin guardar.
     * Si no contiene detalle, se considera que no hay elementos con datos sin guardar.
     */
    private handleDataChanged(event: CustomEvent) {
        if (event.detail) {
            this.dirtyElement = event.detail as IClosable;
        } else {
            this.dirtyElement = undefined;
        }
    }

    /* Tratar evento de la acción de cierre del panel de detalles de la vista */
    private handleCloseDetails(_event: Event) {
        console.log('[UbhView] Close details requested');
        
        if (this.dirtyElement) {
            console.log('[UbhView] Has dirty element, calling close on it');
            this.dirtyElement.close();
        } else {
            console.log('[UbhView] No dirty element, hiding details panel');
            if (this.detailsPanel) {
                this.detailsPanel.hide();
                
                // MOBILE FIX: Ensure panel is fully closed and state is reset
                if (this.isMobile()) {
                    console.log('[UbhView] Mobile close - ensuring clean state');
                    setTimeout(() => {
                        // Force hide in case it didn't close properly
                        if (this.detailsPanel && this.detailsPanel.open) {
                            console.log('[UbhView] Force closing details panel');
                            this.detailsPanel.open = false;
                        }
                    }, 100);
                }
            }
        }
    }

    /*
     * Cerrar vista
     */
    public close(): void {
        if (this.dirtyElement) {
            this.dirtyElement.close();
        }
    }

    /**
     * Verificar si la vista puede cerrarse.
     */
    public canClose(): boolean {
        if (this.dirtyElement) {
            return false; // Si hay un elemento con datos sin guardar, no se puede cerrar
        }
        return true;
    }

    connectedCallback(): void {
        super.connectedCallback();
        this.addEventListener(EVT_LIST_SETTINGS, this.openSettings.bind(this));
        this.addEventListener(EVT_LIST_SETTINGS_CHANGED, this.closeSettings.bind(this));
        this.addEventListener(EVT_LIST_ITEM_SELECTED, this.openDetails.bind(this));
        this.addEventListener(EVT_LIST_ITEM_ADD, this.openDetails.bind(this));
        this.addEventListener(EVT_CLOSE_DETAILS, this.handleCloseDetails.bind(this));
        // TODO: revisar. Ahora mismo no se recibe este evento. 
        this.addEventListener(EVT_DATA_CHANGED, this.handleDataChanged.bind(this) as EventListener);
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.removeEventListener(EVT_LIST_SETTINGS, this.openSettings);
        this.removeEventListener(EVT_LIST_SETTINGS_CHANGED, this.closeSettings);
        this.removeEventListener(EVT_LIST_ITEM_SELECTED, this.openDetails);
        this.removeEventListener(EVT_LIST_ITEM_ADD, this.openDetails);
        this.removeEventListener(EVT_CLOSE_DETAILS, this.handleCloseDetails);
        this.removeEventListener(EVT_DATA_CHANGED, this.handleDataChanged as EventListener);
    }

    /* Visualizar */
    protected render() {
        if (this.isMobile()) {
            return this.renderMobile();
        }

        return html`
            <sl-split-panel>
                <slot name="list" slot="start"></slot>
                <slot name="details" slot="end"></slot>
            </sl-split-panel>
             <sl-drawer id="settings" label="Filtros de la lista" placement="end">
                <slot name="settings"></slot>
            </sl-drawer>
            <ubh-busy></ubh-busy>
        `;
    }

    /* Visualización para dipositivos móviles */
    protected renderMobile() {
        return html`
            <slot name="list" slot="start"></slot>
            <sl-drawer id="details" placement="end" style="--size: 100%;" no-header
                @sl-request-close=${this.handleCloseDetails}
            >
                <slot name="details"></slot>
            </sl-drawer>
            <sl-drawer id="settings" label="Filtros de la lista" placement="end">
                <slot name="settings"></slot>
            </sl-drawer>
        `;
    }

    static componentStyles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
        }

        sl-split-panel {
            margin-top: var(--sl-spacing-small);
        }

        slot, ::slotted(*) {
            display: block;
            width: 100%;
            height: 100%;
        }

    `;

    static styles = [resetStyles, panelsStyles, UbhView.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-view": UbhView;
    }
}