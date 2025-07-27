
import { IAsset, ICenter, ICenterLocation, IDepartment, IEmployee, IRoom, ITask, ITaskEnum, ITaskType } from "@model/data-model";
import { SlDialog, SlTabGroup } from "@shoelace-style/shoelace";
import { css, html, nothing, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { toLocalISOString } from "../../application/utils/datetimeutils";
import { IClosable } from "../base/IClosable";
import UbhComponent from "../base/ubh-component";
import "../base/ubh-editor";
import "../base/ubh-form";
import { EVT_FORM_SAVED } from "../base/ubh-form";
import { EVT_CLOSE_DETAILS, EVT_DATA_CHANGED } from "../base/ubh-view";
import "../booking/ubh-reservations-list";
import "../booking/ubh-roominfo";
import "../centers/ubh-center-select";
import "../centers/ubh-location-select";
import "../centers/ubh-room-info";
import "../centers/ubh-room-select";
import { backOutlineIcon, calendarOutlineIcon, cameraOutlineIcon, homeOutlineIcon, roomOutlineIcon, saveIcon } from "../common/icons";
import "../common/ubh-busy";
import UbhBusy from "../common/ubh-busy";
import { iconStyles } from "../css/icons.css";
import { inputsStyles } from "../css/inputs.css";
import { panelsStyles } from "../css/panels.css";
import { resetStyles } from "../css/reset.css";
import "../hhrr/ubh-department-select";
import "../hhrr/ubh-employee-select";
import { getCleaningRequestTaskType, getDefaultStatus, getRoomDefaultWorkTime, saveTask } from "./tasks-fns";
import "./ubh-task-finish";
import UbhTaskFinish from "./ubh-task-finish";
import "./ubh-task-images-list";
import "./ubh-tasktype-select";


type ValueType = string | number | boolean | Date
    | ICenter | IDepartment
    | ITaskType | ITaskEnum<'target-type' | 'priority' | 'status'>
    | IAsset | ICenterLocation | IRoom
    | IEmployee
    ;

/**
 * Formulario de tareas
 */
@customElement("ubh-task-form")
export default class UbhTaskForm extends UbhComponent implements IClosable {
    @query("#close-dialog")
    private closeDialog?: SlDialog;
    @query("#finish-task-dialog")
    private finishTaskDialog?: UbhTaskFinish;
    @query("#error-dialog")
    private errorDialog?: SlDialog;
    @query('ubh-busy')
    private busy?: UbhBusy;
    @query('sl-tab-group')
    private tabGroup?: SlTabGroup;

    private _value?: ITask;
    @property({ type: Object })
    set value(value: ITask | undefined) {
        this._value = value;
        this._changed = false;
        // this.assignedToMe = false;
        this.requestUpdate();
        this.finishTaskDialog?.requestUpdate();
    }

    get value(): ITask | undefined {
        return this._value;
    }

    @state()
    private _changed = true;
    @state()
    // private assignedToMe = true;
    @state()
    private validationError: string = '';

    private cleaningRequestTaskType?: ITaskType | undefined;

    /* Determina si ha habido cambios en el formulario */
    public get changed() {
        return this._changed;
    }

    /* Cerrar el formulario */
    public close() {
        if (this._changed) {
            this.closeDialog?.show();
        } else {
            this.dispatchEvent(new Event(EVT_CLOSE_DETAILS, { bubbles: true, composed: true }));
        }
    }

    /* Determina si la tarea está asignada */
    private isAssigned(): boolean {
        // return (this._value?.assignedTo ? true : false) || (this.assignedToMe ? true : false);

        return (this._value?.assignedTo ? true : false);
    }

    /* Acción de descartar cambios. Cierra el formulario */
    private discardChanges() {
        this._changed = false;
        this.closeDialog?.hide();
        this.close();
    }

    /* Acción de guardar cambios */
    private save() {
        this.closeDialog?.hide();

        this.busy?.show();

        this.validationError = '';
        saveTask(this.ctx, this._value as ITask)
            .then(savedTask => {
                this._value = { ...savedTask } as ITask;
                this.closeDialog?.hide();
                this._changed = false;
                this.requestUpdate();
            })
            .then(() => {
                // Disparar evento de cambio para notificar que se ha guardado la tarea
                this.dispatchEvent(new CustomEvent(EVT_FORM_SAVED, { bubbles: true, composed: true, detail: this._value }));
                // Evento general de cambio de datos. Sin detalle, para indicar que los datos se han guardado.
                this.dispatchEvent(new CustomEvent(EVT_DATA_CHANGED, { bubbles: true, composed: true }));
            })
            .catch(error => {
                this.validationError = (error as Error).message;
                this.errorDialog?.show();
            })
            .finally(() => this.busy?.hide());
        ;
    }

    /* Tratar cambios en los controles de entrada */
    private handleChange(event: Event) {
        // Caso especial para el diálogo de finalización de tarea.
        if ((event.target as HTMLElement).id === 'finish-task-dialog') {
            const modTask = (event.target as UbhTaskFinish).task;
            this._value = { ...modTask as ITask };
            this._changed = true;
            this.requestUpdate();

            return;
        }

        // Controles de entrada del formulario
        const fieldName = (event.target as HTMLInputElement).name;
        const fieldValue = this.parseValue(event.target as HTMLInputElement);
        this.processChange(fieldName, fieldValue)
            .then(() => {
                this._changed = true;
                this, dispatchEvent(new CustomEvent(EVT_DATA_CHANGED, { bubbles: true, composed: true, detail: this }));
                this.requestUpdate();

                // Si se cambia el empleado asignado a la tarea, se invoca el diálogo de finalización de tarea
                if (fieldName === 'assignedTo' && fieldValue !== undefined) {
                    this.handleFinishTaskRequest();
                }

            })
            .catch(error => {
                console.error(`Campo de formulario de tarea '${fieldName}' inexistente:`, error);
            });
    }

    /* Procesamiento efectivo de los cambios en los controles de entrada */
    private async processChange(fieldName: string, fieldValue: ValueType | undefined) {

        // Valores de campos dependientes según el campo modificado
        const taskTarget = fieldName === 'center' || fieldName === 'targetType'
            ? undefined
            : this._value?.taskTarget;

        const assignedTo = fieldName === 'department' ? undefined : this._value?.assignedTo;


        let workTime = this._value?.workTime ?? 0;
        if (this._value && fieldName === 'taskType') {
            if (this._value.targetType.code === 'room' && this._value.taskTarget) {
                workTime = await getRoomDefaultWorkTime(this.ctx, this._value.taskTarget as IRoom, this._value.taskType) ?? workTime;
            } else {
                workTime = (fieldValue as ITaskType).estimatedWorkTime ?? workTime;
            }
        }

        if (this._value && fieldName === 'taskTarget' && this._value.targetType.code === 'room') {
            workTime = await getRoomDefaultWorkTime(this.ctx, fieldValue as IRoom, this._value.taskType) ?? workTime;
        }

        // if (fieldName === 'assignedTo') {
        //     this.assignedToMe = false;
        // }


        // Actualizar valores
        this.value = {
            ...this._value,
            taskTarget: taskTarget,
            assignedTo: assignedTo,
            workTime: workTime,
            [fieldName]: fieldValue
        } as ITask;

    }

    /* Obtener el valor de un control de entrada según su tipo */
    private parseValue(targetCtrl: HTMLInputElement): ValueType | undefined {
        if (targetCtrl.type === 'number') {
            return isNaN(targetCtrl.valueAsNumber) ? undefined : targetCtrl.valueAsNumber;
        }

        if (targetCtrl.type === 'datetime-local' || targetCtrl.type === 'datetime'
            || targetCtrl.type === 'date' || targetCtrl.type === 'time') {

            if (!targetCtrl.value) {
                return undefined;
            }

            return new Date(targetCtrl.value);
        }

        if (targetCtrl.type === 'checkbox') {
            return targetCtrl.checked;
        }

        return targetCtrl.value;
    }

    /* Tratar la solicitud de finalización de tarea */
    private handleFinishTaskRequest() {
        if (!this.isAssigned() || this.cleaningRequestTaskType !== undefined) {
            this.finishTaskDialog?.show();
        }
    }

    /* Reabrir tarea cerrada */
    private handleReopenTask() {
        getDefaultStatus(this.ctx)
            .then(status => {
                this._value = {
                    ...this._value,
                    status: status,
                    closedOn: undefined,
                } as ITask;
                this._changed = true;
                // this.assignedToMe = false;
                this.requestUpdate();
            });
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        // Obtener el tipo de tarea para las solicitudes de limpieza
        getCleaningRequestTaskType(this.ctx).then(taskType => {
            this.cleaningRequestTaskType = taskType;
        });
    }

    attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
        super.attributeChangedCallback(name, _old, value);

        // Si se cambia el atributo "value", se activa la pestaña/sección principal
        if (name === 'value' && value) {
            this.tabGroup?.show('main');
        }
    }

    /* Visualizar */
    protected render() {
        return html`
            <ubh-form @change=${this.handleChange} @sl-change=${this.handleChange}>
                <header slot="header">
                    <div id="header-content">
                        <div id="header-left">
                            <div id="back-button" class="icon-button toolbar mobile" @click=${this.close}>
                                ${this.isMobile() ? backOutlineIcon : nothing}</div>
                            <span>Tarea Nº ${this._value?.number ?? '?'}</span>
                        </div>
                        <div id="header-right">
                            <div id="save-button" class="icon-button"
                                @click=${this.save}
                            >${this._changed ? saveIcon : nothing}</div>
                        </div>
                    </div>
                    <sl-divider></sl-divider>
                </header>
                <section slot="body">
                    <slot name="body">${this.renderBody()}</slot>
                </section>
                <footer slot="footer">
                    <slot name="footer"></slot>
                </footer>
            </ubh-form>
            <ubh-busy></ubh-busy>
            <sl-dialog id="close-dialog">
                Hay cambios sin guardar.
                <div slot="footer">
                    <sl-button variant="text" size="small" @click=${this.discardChanges}
                    >Descartar cambios</sl-button>
                    <sl-button variant="primary" size="small" @click=${this.save}
                    >Guardar</sl-button>
                </div>
            </sl-dialog>
            <sl-dialog id="error-dialog">
                ${this.validationError}
            </sl-dialog>

            ${this.renderFinishTaskDialog()}
        `;
    }

    /* Visualizar cuerpo del formulario */
    private renderBody() {
        if (!this._value) {
            return html`<span class="no-selection">Seleccione una tarea</span>`;
        }

        return html`
        <sl-tab-group placement="${this.isMobile() ? 'bottom' : 'top'}">
            ${this.renderTab('main', 'General', homeOutlineIcon)}
            ${this.renderTab('tracking', 'Seguimiento', calendarOutlineIcon)}
            ${this._value.targetType.code === 'room'
                ? this.renderTab('room', 'Habitación', roomOutlineIcon)
                : nothing
            }
            ${this.renderTab('images', 'Imágenes', cameraOutlineIcon)}

            <sl-tab-panel name="main">${this.renderGeneralPanel()}</sl-tab-panel>
            <sl-tab-panel name="tracking">${this.renderTrackingPanel()}</sl-tab-panel>
            ${this._value.targetType?.code === 'room'
                ? html`<sl-tab-panel name="room">${this.renderRoomPanel()}</sl-tab-panel>`
                : nothing
            }
            <sl-tab-panel name="images">${this.renderImagesPanel()}</sl-tab-panel>
        </sl-tab-group>
        `;
    }

    /* Método general de visualización de los selectores de sección (tabs) del formulario */
    private renderTab(panel: string, label: string, icon: TemplateResult | undefined = undefined) {
        return html`
            <sl-tab slot="nav" panel="${panel}">
                ${this.isMobile() ? html`<div class="icon-button toolbar mobile">${icon}</div>` : label}
            </sl-tab>
        `;
    }

    /* Visualizar panel principal */
    private renderGeneralPanel() {
        return html`
            <ubh-center-select name="center" label="Centro" required
                 .value=${this._value?.center as any}
            ></ubh-center-select>

            <ubh-department-select name="department" label="Departamento" mode="with-task-types" required
                .value=${this._value?.department as any}
            ></ubh-department-select>

            <ubh-tasktype-select name="taskType" label="Tipo de tarea" required
                .department=${this._value?.department as any}
                .value=${this._value?.taskType as any}
            ></ubh-tasktype-select>
            
            <ubh-task-targettype-select name="targetType" label="Tipo de objeto de tarea" required
                .value=${this._value?.targetType as any}
            ></ubh-task-targettype-select>

            ${this.renderTargetSelect()}

            <ubh-priority-select name="priority" label="Prioridad" required
                .value=${this._value?.priority as any}
            ></ubh-priority-select>

            <div id="status-controls">
                ${this.renderStatus()}
            </div>

            <sl-textarea name="description" label="Descripción" resize="none"
                value=${this.formatDescription(this._value?.description ?? '')}
                @sl-change=${this.handleChange}
            ></sl-textarea>
        `;
    }


    /** Reformatear la descripción eliminando los tags de HTML */
    private formatDescription(text: string) {
        const temp = document.createElement('div');
        temp.innerHTML = text?.toString() ?? '';
        return (temp.textContent || temp.innerText || '').trim();
    }

    /* Visualizar el selector de objeto de tarea según el tipo del mismo */
    private renderTargetSelect() {
        // Activos fijos
        if (this._value?.targetType?.code === 'asset') {
            return html`
                <ubh-asset-select name="taskTarget" label="Activo" searchable required
                    .center=${this._value.center as any}
                    .value=${this._value.taskTarget as any}
                ></ubh-asset-select>
            `;
        }

        // Ubicaciones / Zonas / dependencias
        if (this._value?.targetType?.code === 'location') {
            return html`
                <ubh-location-select name="taskTarget" label="Ubicación / Zona" searchable required
                    .center=${this._value.center as any}
                    .value=${this._value.taskTarget as any}
                ></ubh-location-select>
            `;
        }

        // Habitaciones
        if (this._value?.targetType?.code === 'room') {
            return html`
                <ubh-room-select name="taskTarget" label="Habitación" searchable required
                    .center=${this._value.center as any}
                    .value=${this._value.taskTarget as any}
                ></ubh-room-select>
            `;
        }

        return nothing;
    }

    /* Visualizar los controles de estado de tarea */
    private renderStatus() {
        if (this._value?.status?.code === 'closed') {
            return html`
                <sl-input label="Estado" disabled size="small" value=${this._value?.status.name ?? '?'}></sl-input>
                <sl-button @click=${this.handleReopenTask} variant="primary" size="small">Reabrir</sl-button>
            `;
        }

        return html`
            <ubh-status-select name="status" label="Estado" required
                .value=${this._value?.status as any}
            ></ubh-status-select>
            <sl-button @click=${this.handleFinishTaskRequest} variant="primary" size="small">Finalizar</sl-button>
        `;
    }

    /* Visualizar panel de seguimiento */
    private renderTrackingPanel() {
        return html`
            <sl-input name="createdBy" label="Creada por" disabled size="small"
                value=${this._value?.createdBy?.fullName ?? ''}
            ></sl-input>
            <sl-input type="datetime-local" name="createdOn" label="Fecha de creación" disabled size="small"
                value=${toLocalISOString(this._value?.createdOn)}
            ></sl-input>

            <ubh-employee-select name="notifiedBy" label="Notificada por" searchable clearable
                .value=${this._value?.notifiedBy as any}
            ></ubh-employee-select>
            <sl-input type="datetime-local" name="notifiedOn" label="Fecha de notificación" size="small"
                value=${toLocalISOString(this._value?.notifiedOn)}
            ></sl-input>

            <ubh-employee-select name="reportTo" label="Informar a" searchable clearable
                .value=${this._value?.reportTo as any}
            ></ubh-employee-select>

            <ubh-employee-select name="assignedTo" label="Asignada a" searchable clearable
                .department=${this._value?.department}
                .value=${this._value?.assignedTo as any}
            ></ubh-employee-select>
            <sl-input type="datetime-local" name="startedOn" label="Fecha de inicio" size="small"
                value=${toLocalISOString(this._value?.startedOn)}
            ></sl-input>
            <sl-input type="datetime-local" name="closedOn" label="Fecha de Finalización" size="small"
                value=${toLocalISOString(this._value?.closedOn)}
            ></sl-input>
            <sl-input type="number" inputmode="numeric" name="workTime" label="Tiempo de trabajo (Minutos)" size="small"
                value=${this._value?.workTime?.toString() ?? ''}  
            ></sl-input>
        `;
    }

    /* Visualizar el diálogo de finalización de tarea */
    private renderFinishTaskDialog() {
        return html`
            <ubh-task-finish id="finish-task-dialog" @change=${this.handleChange}
                .task=${this._value}>
            </ubh-task-finish>
        `;
    }

    /* Visualizar panel de habitación */
    private renderRoomPanel() {
        const room = this._value?.taskTarget as IRoom | undefined;
        return html`
            <ubh-roominfo .room=${room}></ubh-roominfo>
        `;
    }

    /* Visualizar panel de imágenes adjuntas a la tarea */
    private renderImagesPanel() {
        return html`
            <ubh-task-images-list name="documents" .value=${this._value?.documents ?? []}></ubh-task-images-list>
        `;
    }


    // Estilos específicos del componente
    static componentStyles = css`  
        #header-content, #header-left, #header-right {
            display: flex;
            align-items: center;
        }

        #header-content {
            justify-content: space-between;
            padding-bottom: var(--sl-spacing-small);
        }

        #header-left {
            justify-content: flex-start;
            gap: var(--sl-spacing-medium);
            font-size: var(--sl-font-size-large);
            font-weight: var(--sl-font-weight-semibold);
        }   

        #header-right {
            justify-content: flex-end;
            gap: var(--sl-spacing-medium);
        }
    
        #save-button svg {
            width: 32px;
            height: 32px;
            fill: var(--sl-color-danger-500);
        }

        ubh-form::part(body) {
            height: 100%;
            width: 100%;
        }

        section[slot="body"] {
            height: 100%;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: var(--sl-spacing-small);
        }

        #status-controls {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: var(--sl-spacing-medium);
        }

        #status-controls sl-button {
            margin-top: 1.2rem;
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

    static styles = [resetStyles, panelsStyles, inputsStyles, iconStyles, UbhTaskForm.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-task-form": UbhTaskForm;
    }
}   