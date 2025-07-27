import UbhComponent from "../base/ubh-component";
import { IEmployee, ITask, ITaskEnum, ITaskType } from "@model/data-model";
import { SlCheckbox, SlDialog } from "@shoelace-style/shoelace";
import { css, html, nothing, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { getCleaningRequestTaskType, getFinishedStatus } from "./tasks-fns";
import { UbhEmployeeSelect } from "../hhrr/ubh-employee-select";


/**
 * Diálogo de finalización de tarea
 */
@customElement('ubh-task-finish')
export default class UbhTaskFinish extends UbhComponent {
    @query('sl-dialog')
    dialog?: SlDialog; 
    @query('ubh-employee-select')
    employeeSelect?: UbhEmployeeSelect;
    @query('sl-checkbox')
    requestCleaningCheckbox?: SlCheckbox;

    private _originalTask?: ITask | undefined;
    private _task: ITask | undefined;
    @property({ type: Object })
    set task(value: ITask | undefined) {
        this._task = !value ? value : { ...value };
        this._originalTask = !value ? value : { ...value };
    }


    private cleaningRequestTaskType?: ITaskType | undefined;
    private finishedStatus?: ITaskEnum<'status'>

    /**
     * Devuelve la tarea que se está finalizando.
     */
    get task() {
        return this._task;
    }


    public show() {
        this.dialog?.show();
    }

    public hide() {
        this.dialog?.hide();
    }

    /*
     * Determina si se puede solicitar limpieza dependiendo de si existe este tipo 
     * de tarea configurado en Guest y, si es así, el departamento asignado a la tarea
     * es distinto del de este tipo de tarea (la de limpieza).
     */
    private canRequestCleaning(): boolean {
        if (!this.cleaningRequestTaskType) {
            return false;
        }

        return this.cleaningRequestTaskType.department?.id !== this._task?.department?.id;
    }

    private handleChange(event: Event) {
        event.stopPropagation();
        if (!this._task) {
            return;
        }

        if (event.target instanceof UbhEmployeeSelect) {
            this._task.assignedTo = event.target.value as IEmployee;
        }

        if (event.target instanceof SlCheckbox) {
            this._task.requestCleaning = (event.target as SlCheckbox).checked;
        }
    }

    private cancelFinish(_event: Event) {
        this._task = !this._originalTask ? undefined : { ...this._originalTask };
        this.hide();
    }

    private finishTask() {
        if (!this._task || !this.finishedStatus) {
            return;
        }

        this._task.assignedTo = this.employeeSelect?.value as IEmployee;
        this._task.requestCleaning = this.requestCleaningCheckbox?.checked ?? false;
        this._task.status = this.finishedStatus;
        this._task.closedOn = new Date();

        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        this.hide();
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        getCleaningRequestTaskType(this.ctx)
            .then(tt => this.cleaningRequestTaskType = tt)
            .then(() =>getFinishedStatus(this.ctx))
            .then(status => this.finishedStatus = status)
            .then(() => this.requestUpdate());
    }

    // Visualización
    protected render() {
        if (!this._task) {
            return nothing;
        }

        return html`
            <sl-dialog id="finish-task-dialog" label="Finalizar tarea" class="${this._task?.assignedTo ? '': 'unassigned'}">
                ${this._task.assignedTo
                ? nothing
                : html`
                    <ubh-employee-select name="assignedTo" label="Asignar a" searchable clearable
                        @change=${this.handleChange}
                        .department=${this._task.department}
                        .value=${this._task.assignedTo ?? this.ctx.currentUser?.employee as any}
                    ></ubh-employee-select>
                `
            }

            ${this.canRequestCleaning()
                ? html`
                    <sl-checkbox name="requestCleaning" @sl-change=${this.handleChange}
                        help-text='Si se marca esta opción, se creará una tarea de limpieza para el departamento correspondiente'
                        value=${this._task?.requestCleaning ? 'true' : 'false'}
                    >Solicitar limpieza</sl-checkbox>
                    `
                : nothing
            }

            <sl-button slot="footer" @click=${this.cancelFinish} >Cancelar</sl-button>
            <sl-button id="finish-task-buttton" slot="footer" @click=${this.finishTask} variant="primary">Finalizar</sl-button>                
        </sl-dialog>
        `;
    }

    static styles = css`
        sl-dialog::part(body) {
            display: flex;
            flex-direction: column;
            gap: var(--sl-spacing-small);
        }       

        sl-dialog.unassigned::part(body) {
            padding-bottom: 15rem;
        }       

        sl-dialog::part(footer) {
            display: flex;
            justify-content: space-between;
        }    
    `;
}


declare global {
    interface HTMLElementTagNameMap {
        'ubh-task-finish': UbhTaskFinish
    }
}