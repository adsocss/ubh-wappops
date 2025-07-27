import UbhComponent from "../base/ubh-component";
import { UBHSelect } from "../base/ubh-select";
import { UBHBlockSelect } from "../centers/ubh-block-select ";
import { UBHFloorSelect } from "../centers/ubh-floor-select";
import { inputsStyles } from "../css/inputs.css";
import { resetStyles } from "../css/reset.css";
import { ICenter, ICenterBlock, IFloor, IRoomRange } from "@model/data-model";
import { SlCheckbox } from "@shoelace-style/shoelace";
import { css, html, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { IRoomStatusListSettings } from "./IRoomStatusListSettings";
import { UBHRoomRangeSelect } from "./ubh-room-range-select";
import "../centers/ubh-center-select";
import "../centers/ubh-block-select ";
import "../centers/ubh-floor-select";
import "./ubh-room-range-select"
import { EVT_LIST_SETTINGS_CHANGED } from "../base/ubh-list";
import { Wappops } from "../../application/wappops";
import { hasAllCentersPermission } from "../../application/utils/permissions-fns";
import { getOperationsCenters } from "../centers/centers-fns";

@customElement('ubh-rooms-status-list-settings')
export class UbhRoomsStatusListSettings extends UbhComponent {
    @query('ubh-block-select')
    private blocksSelect?: UBHBlockSelect;
    @query('ubh-floor-select')
    private floorsSelect?: UBHFloorSelect;
    @query('ubh-room-range-select')
    private rangesSelect?: UBHRoomRangeSelect;

    @property({ type: Object })
    settings: IRoomStatusListSettings | undefined = undefined;

    private defaultSettings: IRoomStatusListSettings | undefined = undefined

    /* Establecer valores por defecto */
    private setDefaults() {
        if (!this.defaultSettings) {
            getDefaultSettings(this.ctx)
                .then(ds => this.defaultSettings = ds)
                .then(() => {
                    if (this.defaultSettings) {
                        this.settings = { ...this.defaultSettings };
                        this.setSelectValue('centers', this.settings.centers);
                        this.setSelectValue('blocks', this.settings.blocks);
                        this.setSelectValue('floors', this.settings.floors);
                        this.setSelectValue('ranges', this.settings.ranges);
                        this.setSelectValue('status', this.settings.status);
                        this.setCheckboxValue('withPendingTasks', this.settings.withPendingTasks);
                    }
                })
                .then(() => this.requestUpdate());
        };
    }

    /* Actualizar los valores de los filtros */
    private updateSettings(_event: Event) {
        if (!this.settings) {
            this.settings = { ...this.defaultSettings as IRoomStatusListSettings};
        };

        this.settings = {
            ...this.settings,
            centers: this.getSelectValue('centers') as ICenter[] ?? undefined,
            blocks: this.getSelectValue('blocks') as ICenterBlock[] ?? undefined,
            floors: this.getSelectValue('floors') as IFloor[] ?? undefined,
            ranges: this.getSelectValue('ranges') as IRoomRange[] ?? undefined,
            status: this.getSelectValue('status') as 'clean' | 'dirty' | undefined,
            withPendingTasks: this.getCheckBoxValue('withPendingTasks') as boolean ?? false,
            withArrivals: this.getCheckBoxValue('withArrivals') as boolean ?? false,
            withDepartures: this.getCheckBoxValue('withDepartures') as boolean ?? false
        };

        this.blocksSelect!.centers = this.settings.centers;
        this.blocksSelect?.reloadOptions();
        this.floorsSelect!.centers = this.settings.centers;
        this.floorsSelect?.reloadOptions();
        this.rangesSelect!.centers = this.settings.centers;
        this.rangesSelect?.reloadOptions();

        this.requestUpdate();
    }

    /* Obtener el valor de un filtro determinado por nombre */
    private getSelectValue(name: string): any {
        const input = this.shadowRoot?.querySelector(`[name="${name}"]`) as UBHSelect<any>;
        if (!(input instanceof UBHSelect)) return undefined;
        if (input.value === undefined) return undefined;
        if (input.value instanceof Array && input.value.length === 0) return undefined;
        if (input.value instanceof Array) return input.value;
        if (name === 'status') {
            return input.value === '' ? undefined : input.value;
        }

        return [input.value];
    }

    /* Obtener el valor de un checkbox determinado por nombre */
    private getCheckBoxValue(name: string): boolean {
        const input = this.shadowRoot?.querySelector(`[name="${name}"]`) as SlCheckbox;
        if (input) {
            return input.checked;
        }
        return false;
    }

    /* Establecer el valor de un filtro determinado por nombre */
    setSelectValue(name: string, value: any) {
        const input = this.shadowRoot?.querySelector(`[name="${name}"]`) as UBHSelect<any> | SlCheckbox;
        if (input instanceof UBHSelect) {
            input.value = value;
        } else {
            input.checked = value;
        }
    }

    /* Establecer el valor de un checkbox determinado por nombre */
    setCheckboxValue(name: string, value: boolean) {
        const input = this.shadowRoot?.querySelector(`[name="${name}"]`) as SlCheckbox;
        if (input) {
            input.checked = value;
        }
    }

    /* Establecer valores finales de los filtros */
    private setSettings(_event: Event) {
        this.updateSettings(_event);
        this.dispatchEvent(new CustomEvent(EVT_LIST_SETTINGS_CHANGED, {
            detail: this.settings,
            bubbles: true,
            composed: true
        }));
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        this.setDefaults();
    }


    /* Visualizar */
    protected render() {
        if (!this.settings) {
            this.settings = { ...this.defaultSettings as IRoomStatusListSettings};
        }

        return html`
            <ubh-form>
                <ubh-center-select slot="body" name="centers" label="Centros"
                    @change=${this.updateSettings}
                    .value=${this.settings?.centers} .multiple=${!hasAllCentersPermission(this.ctx.currentUser)}
                ></ubh-center-select>
                <ubh-block-select slot="body" name="blocks" label="Bloques"
                    @change=${this.updateSettings}
                    .centers=${this.settings?.centers}
                    .value=${this.settings?.blocks} multiple
                ></ubh-block-select>
                <ubh-floor-select slot="body" name="floors" label="Plantas"
                    .value=${this.settings?.floors} multiple
                ></ubh-floor-select>
                <ubh-room-range-select slot="body" name="ranges" label="Rangos"
                    .value=${this.settings?.ranges} multiple
                ></ubh-room-range-select>
                <sl-select slot="body" name="status" label="Estado" size="small"
                    @sl-change=${this.updateSettings}
                    value=${this.settings?.status ?? ''} clearable>   
                    <sl-option value="clean">Limpia</sl-option>
                    <sl-option value="dirty">Sucia</sl-option>
                </sl-select>

                <sl-checkbox slot="body" name="withPendingTasks"
                    @sl-change=${this.updateSettings}
                    ?checked=${this.settings?.withPendingTasks ?? false}>
                    Con tareas pendientes
                </sl-checkbox>
                <sl-checkbox slot="body" name="withArrivals"
                    @sl-change=${this.updateSettings}
                    ?checked=${this.settings?.withArrivals ?? false}>
                    Con entrada
                </sl-checkbox>
                <sl-checkbox slot="body" name="withDepartures"
                    @sl-change=${this.updateSettings}
                    ?checked=${this.settings?.withDepartures ?? false}>
                    Con salida
                </sl-checkbox>

                <section slot="footer" class="form-actions">
                    <sl-button variant="default" @click="${this.setDefaults}">Restablecer</sl-button>
                    <sl-button variant="primary" @click="${this.setSettings}">Aplicar</sl-button>
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

            sl-checkbox {
                margin-top: var(--sl-spacing-x-small);
                width: 100%;
            }
        `;

    static styles = [resetStyles, inputsStyles, UbhRoomsStatusListSettings.componentsStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-rooms-status-list-settings': UbhRoomsStatusListSettings
    }
}

/**
 * Función auxiliar que obtiene los valores por defecto de la configuración de la lista de habiitaciones.
 * @param { Wappops } ctx - Contexto de la aplicación.
 * @returns { Promise<ITasksListSettings> } - Valores por defecto de la configuración de la lista de habitaciones.
 */
export async function getDefaultSettings(ctx: Wappops): Promise<IRoomStatusListSettings> {

    let centers = undefined;
    if (hasAllCentersPermission(ctx.currentUser)) {
        const opCenters = await getOperationsCenters(ctx);
        if (opCenters?.length > 0) {
            centers = opCenters[0];
        }
    }

    return {
        centers: centers ? [centers] : undefined,
        blocks: undefined,
        floors: undefined,
        ranges: undefined,
        status: undefined,
        withPendingTasks: false,
        withArrivals: false,
        withDepartures: false
    };
}