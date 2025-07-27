import { ICenter, IDepartment, ITaskEnum } from "@model/data-model";
import { css, html, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Wappops } from "../../application/wappops";
import UbhComponent from "../base/ubh-component";
import "../base/ubh-form";
import { UBHSelect } from "../base/ubh-select";
import "../centers/ubh-center-select";
import { inputsStyles } from "../css/inputs.css";
import { resetStyles } from "../css/reset.css";
import "../hhrr/ubh-department-select";
import { ITasksListSettings } from "./ITaskListSettings";
import "./ubh-priority-select";
import "./ubh-status-select";
import "./ubh-task-targettype-select";
import { EVT_LIST_SETTINGS_CHANGED } from "../base/ubh-list";
import { hasAllCentersPermission } from "../../application/utils/permissions-fns";
import { getOperationsCenters } from "../centers/centers-fns";

/**
 * Component de configuración de la lista de tareas.
 */
@customElement('ubh-tasks-list-settings')
export class UBHTasksListSettings extends UbhComponent {
    @property({ type: Object })
    settings: ITasksListSettings | undefined = undefined;

    private defaultSettings: ITasksListSettings | undefined = undefined;

    /* Establecer valores por defecto */
    private setDefaults() {
        getDefaultSettings(this.ctx)
            .then(s => this.defaultSettings = s)
            .then(() => {
                if (!this.defaultSettings) return;
                
                this.settings = { ...this.defaultSettings };

                this.setSelectValue('centers', this.settings.filter.centers);
                this.setSelectValue('departments', this.settings.filter.departments);
                this.setSelectValue('targetTypes', this.settings.filter.targetTypes);
                this.setSelectValue('statuses', this.settings.filter.statuses);
                this.setSelectValue('priorities', this.settings.filter.priorities);
                this.setSelectValue('sortfield', this.settings.sort.field);
                this.setSelectValue('order', this.settings.sort.order);
            })
            .then(() => this.requestUpdate());
    }

    /* Actualizar los valores de los filtros */
    private updateSettings(_event: Event) {
        if (!this.settings) return;

        this.settings.filter.centers = this.getSelectValue('centers') as ICenter[] | undefined;
        this.settings.filter.departments = this.getSelectValue('departments') as IDepartment[] | undefined;
        this.settings.filter.targetTypes = this.getSelectValue('targetTypes') as ITaskEnum<'target-type'>[] | undefined;
        this.settings.filter.statuses = this.getSelectValue('statuses') as ITaskEnum<'status'>[] | undefined;
        this.settings.filter.priorities = this.getSelectValue('priorities') as ITaskEnum<'priority'>[] | undefined;
        this.settings.sort.field = this.getSelectValue('sortfield') as 'startedOn' | 'notifiedOn';
        this.settings.sort.order = this.getSelectValue('order') as 'ascending' | 'descending';
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
                <ubh-department-select slot="body" name="departments" label="Departamentos"
                    .value="${this.settings?.filter.departments}" multiple>
                </ubh-department-select>
                <ubh-task-targettype-select slot="body" name="targetTypes" label="Tipos de objeto de tarea">
                    .value="${this.settings?.filter.targetTypes}" multiple>                 
                </ubh-task-targettype-select>
                <ubh-status-select slot="body" name="statuses" label="Estados" includeClosed
                    .value="${this.settings?.filter.statuses}" multiple>    
                </ubh-status-select>
                <ubh-priority-select slot="body" name="priorities" label="Prioridades"
                    .value="${this.settings?.filter.priorities}" multiple>
                </ubh-priority-select>
                <sl-select slot="body" name="sortfield" label="Ordenar por" size="small"
                    value="${this.settings?.sort.field ?? 'notifiedOn'}">
                    <sl-option value="notifiedOn">Fecha de notificación</sl-option>
                    <sl-option value="createdOn">Fecha de creación</sl-option>
                </sl-select>
                <sl-select slot="body" name="order" label="Orden" size="small"
                    value="${this.settings?.sort.order ?? 'ascending'}">
                    <sl-option value="ascending">De menor a mayor</sl-option>
                    <sl-option value="descending">De mayor a menor</sl-option>
                </sl-select>
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

    static styles = [resetStyles, inputsStyles, UBHTasksListSettings.componentsStyles];
}

/**
 * Función auxiliar que obtiene los valores por defecto de la configuración de la lista de tareas.
 * @param { Wappops } ctx - Contexto de la aplicación.
 * @returns { Promise<ITasksListSettings> } - Valores por defecto de la configuración de la lista de tareas.
 */
export async function getDefaultSettings(ctx: Wappops): Promise<ITasksListSettings> {
    const statuses = await ctx.db.tasksEnums
        .filter(e => e.type === 'status')
        .filter(e => e.code !== 'closed')
        .toArray();

    let departments = undefined;
    if (ctx.currentUser?.department) {
        if (!ctx.currentUser.roles.includes('wappops-manager-all')) {
            departments = ctx.currentUser?.department ? [ctx.currentUser.department] : undefined;
        }
    }

    let centers = undefined;
    if (hasAllCentersPermission(ctx.currentUser)) {
        const opCenters = await getOperationsCenters(ctx);
        if (opCenters?.length > 0) {
            centers = opCenters[0];
        }
    }

    const defSettings: ITasksListSettings = {
        filter: {
            centers: centers ? [centers] : undefined,
            departments: departments,
            targetTypes: undefined,
            statuses: statuses,
            priorities: undefined,
        },
        sort: {
            field: 'notifiedOn',
            order: 'ascending'
        }
    }

    return defSettings;
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-tasks-list-settings': UBHTasksListSettings
    }
}