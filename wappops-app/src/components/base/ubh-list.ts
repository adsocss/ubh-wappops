import { SlInput } from "@shoelace-style/shoelace";
import { css, html, nothing, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import UbhComponent from "../base/ubh-component";
import { addOutlineIcon, reloadOutlineIcon, searchOutlineIcon, settingsOutlineIcon } from "../common/icons";
import "../common/ubh-busy";
import UbhBusy from "../common/ubh-busy";
import { iconStyles } from "../css/icons.css";
import { resetStyles } from "../css/reset.css";

/**
 * Evento de selección de un elemento de la lista
 * @event ubh-list-item-selected
 * @detail Elemento seleccionado
 */
export const EVT_LIST_ITEM_SELECTED = "ubh-list-item-selected";

/**
 * Evento de invocación de la acción de añadir un elemento a la lista.
 * @event ubh-list-item-add
 */
export const EVT_LIST_ITEM_ADD = "ubh-list-item-add";

/**
 * Evento de invocación de la acción de recargar la lista.
 * @event ubh-list-item-reload
 */
export const EVT_LIST_RELOAD = "ubh-list-reload";

/**
 * Evento de invocación de la acción de búsqueda en la lista.
 * Señaliza la visualización del control de búsqueda, no la acción de búsqueda en sí.
 * @event ubh-list-search
 */
export const EVT_LIST_SEARCH = "ubh-list-search";

/**
 * Evento de invocación de la acción de configuración de la lista.
 * @event ubh-list-settings
 */
export const EVT_LIST_SETTINGS = "ubh-list-settings";

/**
 * Evento de cambio de configuración de la lista.
 * @event ubh-list-settings-changed
 */
export const EVT_LIST_SETTINGS_CHANGED = "ubh-list-settings-changed";

/**
 * Evento de señal de lista cargando datos.
 * Usar para activar el overlay de carga de la vista.
 * @event ubh-list-loading
 */
export const EVT_LIST_LOADING = "ubh-list-loading";

/**
 * Evento de señal de lista cargada.
 * Usar para desactivar el overlay de carga de la vista.
 * @event ubh-list-loaded
 */
export const EVT_LIST_LOADED = "ubh-list-loaded";

/**
 * Componente base para listas de elementos
 * @template T Tipo de elemento a visualizar
 */
@customElement("ubh-list")
export default abstract class UbhList<T> extends UbhComponent {
    @query("#search-box")
    private searchBox!: SlInput;
    @query("ubh-busy")
    private busyIndicator!: UbhBusy;

    @state()
    protected items: T[] = [];

    @property()
    label: string = 'Lista';
    @property({ type: Boolean })
    canReload: boolean = true;
    @property({ type: Boolean })
    canSearch: boolean = true;
    @property({ type: Boolean })
    canAdd: boolean = true;
    @property({ type: Boolean })
    selectable: boolean = true;
    @property({ type: Boolean })
    canConfigure: boolean = false;
    @property({ type: Boolean })
    hasSettings = false;

    /**
     * Cargar los datos de la lista
     */
    protected abstract load(): Promise<T[]>;

    /* Obtener el valor del control de búsqueda */
    protected get searchValue(): string {
        return this.normalizeSearchTerm(this.searchBox?.value ?? '');
    }

    /* Establecer el valor del control de búsqueda */
    protected set searchValue(value: string) {
        this.searchBox.value = value?.trim() ?? '';
    }

    /* Conmutar la visibilidad del control de búsqueada */
    private toggleSearchBox() {
        this.searchValue = ''
        this.searchBox.toggleAttribute("disabled");
        if (!this.searchBox.disabled) {
            this.searchBox.focus(); // TODO: REVISAR, no está funcionando
        }
    }

    /* Tratamiento de los eventos del control de búsqueda */
    protected handleSearch(_event: KeyboardEvent) {
        this.reload();
    }

    /* Normalizar término para comparaciones de búsqueda */
    protected normalizeSearchTerm(value: string | number | undefined | null, isHtml: boolean = false): string {
        // Caso especial para valores con contenido HTML. Previene
        // falsas coincidencias con etiquetas, códigos de colores, etc.
        if (isHtml) {
            const temp = document.createElement('div');
            temp.innerHTML = value?.toString() ?? '';

            return (temp.textContent || temp.innerText || '').trim().toLowerCase();
        }

        return value?.toString().trim().toLowerCase() ?? '';
    }

    /* Tratar evento de recarga de datos */
    private async handleReload() {
        this.busyIndicator.show();

        // Retardo para 'feedback' visual
        setTimeout(async () => {
            await this.reload();
            this.busyIndicator.hide();
            this.dispatch(EVT_LIST_RELOAD, null);
        }, 1000);
    }

    /* Recargar datos */
    public async reload() {
        this.load().then((items) => {
            this.items = items;
            this.requestUpdate();
        });
    }

    /* Tratar evento de añadir elemento */
    private handleAdd() {
        this.dispatch(EVT_LIST_ITEM_ADD, null);
    }

    /*
     * Tratar evento de petición de configuración de la lista
     * solo si la lista dispone de configuración.
     */
    private handleSettings() {
        if (this.hasSettings) {
            this.dispatch(EVT_LIST_SETTINGS, null);
        }
    }

    /* Método general para lanzar eventos de la lista */
    private dispatch(type: string, detail: any) {
        this.dispatchEvent(new CustomEvent(type, {
            bubbles: true,
            composed: true,
            detail: detail
        }));
    }

    connectedCallback(): void {
        super.connectedCallback();
        this.firstLoad();
    }


    /* Carga inicial de datos  */
    private async firstLoad() {
        this.dispatchEvent(new Event(EVT_LIST_LOADING, { bubbles: true, composed: true }));

        // Retardo para dar tiempo a que el componente esté construido
        await new Promise(r => setTimeout(r, 2000));

        this.load().then((items) => {
            this.items = items;
            this.requestUpdate();
            this.dispatchEvent(new Event(EVT_LIST_LOADED, { bubbles: true, composed: true }));
        });
    }

    /* Visualizar */
    protected render() {
        return html`
            <div id="wrapper">
                <header>
                    ${this.renderHeader()}
                    <sl-input id="search-box" type="search" size="small" placeholder="Buscar ..." clearable disabled
                        autocomplete="off"
                        @sl-input=${this.handleSearch}
                        @sl-clear=${() => this.searchValue = ''}
                    ></sl-input>
                </header>
                <section id="list">
                    ${this.renderItems()}
                </section>
                <footer>${this.renderFooter()}</footer>
            </div>
            <ubh-busy></ubh-busy>
        `;
    }

    private renderHeader() {
        if (this.isMobile()) {
            return this.renderMobileHeader();
        }

        return html`
            <div id="toolbar">
                <div id="title">
                    ${this.label}
                    <sl-badge pill>${this.items.length}</sl-badge>
                </div>
                ${this.renderActions()}
            </div>
        `;
    }

    private renderMobileHeader() {
        return html`
            <div id="toolbar">
                <div id="title">
                    ${this.label}
                    <sl-badge pill>${this.items.length}</sl-badge>
                </div>
            </div>
        `;
    }

    private renderFooter() {
        if (this.isMobile()) {
            return this.renderMobileFooter();
        }

        return html`<div id="bottom-spacer"></div>`;
    }

    private renderMobileFooter() {
        return html`
            <sl-divider></sl-divider>
            ${this.renderActions('mobile')}
        `;
    }

    private renderActions(formFactor: 'mobile' | undefined = undefined) {
        return html`
            <div id="actions" class="${formFactor ?? ''}">
                ${this.canReload
                ? html`<div class="icon-button toolbar ${formFactor ?? ''}"
                        @click=${this.handleReload}
                    >${reloadOutlineIcon}</div>`
                : nothing
            }
                ${this.canAdd
                ? html`<div id="add-button" class="icon-button toolbar ${formFactor ?? ''}"
                        @click=${this.handleAdd}
                    >${addOutlineIcon}</div>`
                : nothing
            }
                ${this.canSearch
                ? html`<div class="icon-button toolbar ${formFactor ?? ''}"
                        @click=${this.toggleSearchBox}
                    >${searchOutlineIcon}</div>`
                : nothing
            }
                ${this.hasSettings
                ? html`<div class="icon-button toolbar ${formFactor ?? ''}"
                        @click=${this.handleSettings}
                    >${settingsOutlineIcon}</div>`
                : nothing}
            </div>
        `;
    }


    /* Visualiza la lista de elementos */
    protected renderItems() {
        return html`
           ${this.items.map((item) => this.renderItem(item))}
        `;
    }

    /**
     * Visualiza un elemento de la lista
     * @param { T } item Elemento a visualizar
     */
    protected abstract renderItem(item: T): TemplateResult;


    static componentStyles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
        }

        #wrapper {
            display: grid;
            grid-template-rows: auto 1fr auto;
            width: 100%;
            height: 100%;
        }

        #toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--sl-spacing-x-small);
        }

        #actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: var(--sl-spacing-small);
        }

        #actions.mobile {
            justify-content: center;
            padding: var(--sl-spacing-x-small);
            padding: var(--sl-spacing-medium);
        }

        #list {
            width: 100%;
            height: 100%;
            overflow: auto;
        }

        #search-box {
            width: 100%;
            padding: var(--sl-spacing-small);
        }

        #search-box[disabled] {
            display: none;
        }

        #add-button.mobile {
            position: absolute;
            bottom: 6rem;
            right: 2rem;
            z-index: 1;
        }

        #add-button.mobile svg {
            height: 48px;
            width: 48px;
            border-radius: 50%;
            fill: var(--sl-color-primary-50);
            background-color: var(--sl-color-primary-600);
        }

        #bottom-spacer {
            height: 2rem;
        }
    `;

    static styles = [resetStyles, iconStyles, UbhList.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-list": UbhList<any>;
    }
}
