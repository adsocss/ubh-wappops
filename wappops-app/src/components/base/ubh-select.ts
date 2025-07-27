import { SlInput, SlSelect } from "@shoelace-style/shoelace";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { resetStyles } from "../css/reset.css";
import { inputsStyles } from "../css/inputs.css";

/**
 * Tipo de las opciones de selección.
 */
export type SelectOption = {
    value: string
    description: string
}

/**
 * Implementación base de control de selección.
 */
@customElement('ubh-select')
export abstract class UBHSelect<T> extends LitElement {
    @query('sl-select')
    select?: SlSelect;
    @query('#searchbox')
    searchbox?: SlInput;

    @property()
    name?: string;
    @property()
    label?: string;
    @property()
    placeholder?: string;
    @property()
    size: 'small' | 'medium' | 'large' = 'small';
    @property({ type: Boolean })
    required = false;
    @property({ type: Boolean })
    multiple = false;
    @property({ type: Boolean })
    clearable = false;
    @property({ type: Boolean })
    disabled = false;
    @property({ type: Boolean })
    searchable = false;

    @property({ type: Array })
    value: T[] | T | undefined = undefined;
    @property({ type: Object })
    defaultValue: T | undefined = undefined;

    @state()
    protected options: T[] = [];

    /**
     * Devuelve la lista de opciones de selección.
     * @returns { T[] | Promise<T[]> } Lista de opciones de selección.
     */
    protected abstract getOptions(): Promise<T[]>
    protected abstract getOptions(): T[]

    /**
     * Conversión de un valor de tipo genérico T a una opción
     * de selección {@link SelectOption}
     * 
     * @param { T } option - Opción.
     * @returns { SelectOption } - Opción de selección.
     */
    protected abstract mapToSelectOption(option: T): SelectOption;

    /**
     * Convierte el/los valores del componente interno <sl-select> a
     * un valor, o una lista de valores, del  tipo genérico T. Si el valor
     * del componente interno es 'undefined' o una lista vacía, se devuelve
     * 'undefined', a entender como nada seleccionado.
     * @returns 
     */
    protected updateValue(): T[] | T | undefined {
        let vals: string[] = [];
        if (!this.select?.value) {
            return undefined;
        }

        if (this.select.value instanceof Array) {
            vals = this.select.value;
        } else {
            vals = [this.select.value];
        }

        const selected = this.options
            .filter(o => vals.includes(this.mapToSelectOption(o).value));

        if (selected.length === 0) {
            return undefined;
        }

        return selected.length === 1 ? selected[0] : selected;
    }

    /**
     * Convierte un valor de tipo genérico T) al valor esperado por el
     * componente <sl-select>: una lista de 'strings' separados por un
     * espacio en blanco que se corresponden con valores de las opciones
     * <sl-option>.
     * 
     * @param { T[] | T | undefined } option - Opción a convertir. Si no se
     *                                especifica, se usará el valor actual
     *                                de este componente.
     */
    protected mapToSelectValue(option: T[] | T | undefined = this.value): string {
        if (!this.hasValue(option)) return '';
        if (option instanceof Array) {
            return option
                .map(o => this.mapToSelectOption(o))
                .map(so => so.value)
                .join(' ');
        } else {
            return this.mapToSelectOption(option as T).value;
        }
    }

    /* Tratamiento del evento de selección de opción */
    private handlechangeEvent(event: CustomEvent) {
        if (event.target instanceof SlSelect) {
            event.stopPropagation();
            this.value = this.updateValue();
            if (this.searchbox) {
                this.searchbox.value = '';
            }
            this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        }
    }

    /**
     * Determina si un campo del tipo de valor del componente tiene valor asignado.
     * @param { T } option - Opción
     * @returns { boolean } - 'true' si tiene valor asignado.
     */
    protected hasValue(option: T[] | T | undefined): boolean {
        if (!option) return false;
        if (option instanceof Array && option.length === 0) return false;
        return true;
    }

    /* Tratamiento del los eventos de teclado del control de búsqueda */
    private handleInput(event: Event) {
        // Inhibir comportamiento de búsqueda de <sl-select>        
        event.stopImmediatePropagation();
        if (event.type === 'keyup') {
            this.requestUpdate();
        }
    }

    /**
     * Determina si se da la coincidencia entre un término de búsqueda
     * y el elemento de datos especificado.
     * @param { T } option - Elemento de datos.
     * @param { string } searchTerm -Término de búsqueda.
     */
    protected matchesSearch(option: T, searchTerm: string): boolean {
        const term = (searchTerm ?? '').trim().toLowerCase();
        const value = this.mapToSelectOption(option).description.trim().toLocaleLowerCase();

        return value.startsWith(term);
    }

    /* Inicialización */
    connectedCallback(): void {
        super.connectedCallback();
        if (!this.hasValue(this.value)) {
            this.value = this.defaultValue;
        }

        this.load();
    }

    /* Cargar las opciones de selección */
    protected load() {
        const opts = this.getOptions();
        if (opts instanceof Array) {
            this.options = opts;
            this.setSingleOption(this.options);
        } else {
            opts
                .then(options => this.options = options)
                .then(options => this.setSingleOption(options));
        }
    }

    /* Si solo hay una opción, establecer como valor y desabilitar el control */
    private setSingleOption(options: T[]) {
        if (options.length === 1) {
            this.value = this.options[0];
            this.disabled = true;
            // this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        }
    }

    /* Visualizar */
    protected render() {
        return html`
            <sl-select
                @sl-change="${this.handlechangeEvent}"
                name=${this.name ?? ''}
                label="${this.label ?? ''}"
                placeholder= "${this.placeholder ?? ''}"
                size="${this.size}"
                value="${this.mapToSelectValue()}"
                defaultValue=${this.mapToSelectValue(this.defaultValue)}
                .multiple="${this.multiple}"
                .required="${this.required}"
                .clearable="${this.clearable}"
                .disabled="${this.disabled}"
            >
                ${this.renderSearchbox()}                
                ${this.renderSelectOptions()}
            </sl-select>
        `;
    }

    /* Visualización condicional del control de búsqueda*/
    private renderSearchbox() {
        return this.searchable
            ? html`
                <sl-input id="searchbox" placeholder="Buscar ..." size="${this.size}"
                    @keydown="${this.handleInput}"
                    @keyup="${this.handleInput}"
                ></sl-input>
            `
            : nothing
    }

    /* Visualización de las opciones de selección */
    protected renderSelectOptions() {
        const searchTerm = (this.searchbox?.value ?? '').trim();
        return this.options
            .filter(o => !this.searchable || this.matchesSearch(o, searchTerm))
            .map(o => this.renderOption(o));
    }

    /* Visualización de opción de la lista */
    protected renderOption(option: T) {
        const so = this.mapToSelectOption(option);

        return html`
            <sl-option value="${so.value}">${so.description}</sl-option>
        `;
    }

    private static componentStyles = css`
        /* sl-option::part(label) {
            font-size: 80%;
        }

        sl-select::part(form-control-label) {
            text-transform: uppercase;
            font-size: 70%;
            font-weight: bold;
        } */

        #searchbox {
            position: sticky;
            top: -10px;
            left: 0;
            z-index: 10000;
            margin-top: 0;
            margin-bottom: 0.5rem;
        }
    `;

    static styles = [resetStyles, inputsStyles, UBHSelect.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-select': UBHSelect<any>
    }
}