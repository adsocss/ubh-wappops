import { ICenter } from "@model/data-model";
import { css, html, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { hasAllCentersPermission } from "../../application/utils/permissions-fns";
import { Wappops } from "../../application/wappops";
import UbhComponent from "../base/ubh-component";
import "../base/ubh-form";
import { EVT_LIST_SETTINGS_CHANGED } from "../base/ubh-list";
import { UBHSelect } from "../base/ubh-select";
import { getOperationsCenters } from "../centers/centers-fns";
import "../centers/ubh-center-select";
import { inputsStyles } from "../css/inputs.css";
import { resetStyles } from "../css/reset.css";
import "../hhrr/ubh-department-select";
import { ICountersListSettings } from "./ICountersListSettings";

/**
 * Componente de configuración de la lista de contadores.
 */
@customElement('ubh-counters-list-settings')
export class UBHCountersListSettings extends UbhComponent {
    @property({ type: Object })
    settings: ICountersListSettings | undefined = undefined;

    private defaultSettings: ICountersListSettings | undefined = undefined;

    /* Establecer valores por defecto */
    private setDefaults() {
        getDefaultSettings(this.ctx)
            .then(s => this.defaultSettings = s)
            .then(() => {
                if (!this.defaultSettings) return;
                
                this.settings = { ...this.defaultSettings };

                this.setSelectValue('centers', this.settings.filter.centers);
            })
            .then(() => this.requestUpdate());
    }

    /* Actualizar los valores de los filtros */
    private updateSettings(_event: Event) {
        if (!this.settings) return;

        this.settings.filter.centers = this.getSelectValue('centers') as ICenter[] | undefined;
        this.dispatchEvent(new CustomEvent(EVT_LIST_SETTINGS_CHANGED, {
            detail: this.settings,
            bubbles: true,
            composed: true
        }));
    }

    /* Obtener el valor de un filtro determinado por nombre */
    private getSelectValue(name: string): any {
        const input = this.shadowRoot?.querySelector(`[name="${name}"]`) as UBHSelect<any>;
        if (input) {
            if (input.value === undefined || input.value instanceof Array) {
                return input.value;
            } else {
                return name === 'sortfield' || name === 'order' ? input.value : [input.value];
            }
        }
        return undefined;
    }

    /* Establecer el valor de un filtro determinado por nombre */
    setSelectValue(name: string, value: any) {
        const input = this.shadowRoot?.querySelector(`[name="${name}"]`) as UBHSelect<any>;
        if (input) {
            input.value = value;
        }
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        super.firstUpdated(_changedProperties);
        // Obtener los valores por defecto
        getDefaultSettings(this.ctx)
            .then(settings => this.defaultSettings = { ...settings })
            .then(() => this.requestUpdate());
    }

    /* Visualizar */
    protected render() {
        if (!this.settings) {
            this.setDefaults();
        }

        return html`
            <ubh-form>
                <ubh-center-select slot="body" name="centers" label="Centros"
                    .value="${this.settings?.filter.centers}" .multiple=${!hasAllCentersPermission(this.ctx.currentUser)}>
                </ubh-center-select>
                <section slot="footer" class="form-actions">
                    <sl-button variant="default" @click="${this.setDefaults}">Restablecer</sl-button>
                    <sl-button variant="primary" @click="${this.updateSettings}">Aplicar</sl-button>
                </section>
            </ubh-form>
        `;
    }

    // Estilos CSS especificos de este componente.
    static componentsStyles = css`
        .form-actions {
            display: flex;
            justify-content: space-between;
            width: 100%;
        }
    `;

    static styles = [resetStyles, inputsStyles, UBHCountersListSettings.componentsStyles];
}

/**
 * Función auxiliar que obtiene los valores por defecto de la configuración de la lista de contadores.
 * @param { Wappops } ctx - Contexto de la aplicación.
 * @returns { Promise<ITasksListSettings> } - Valores por defecto de la configuración de la lista de contadores.
 */
export async function getDefaultSettings(ctx: Wappops): Promise<ICountersListSettings> {
    let centers = undefined;
    if (hasAllCentersPermission(ctx.currentUser)) {
        const opCenters = await getOperationsCenters(ctx);
        if (opCenters?.length > 0) {
            centers = opCenters[0];
        }
    }

    const defSettings: ICountersListSettings = {
        filter: {
            centers: centers ? [centers] : undefined,
        }
    }

    return defSettings;
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-counters-list-settings': UBHCountersListSettings
    }
}