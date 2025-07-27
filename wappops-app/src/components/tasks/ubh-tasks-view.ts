import { ITask } from "@model/data-model";
import { css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import UbhComponent from "../base/ubh-component";
import "../base/ubh-view";
import { panelsStyles } from "../css/panels.css";
import { resetStyles } from "../css/reset.css";
import { ITasksListSettings } from "./ITaskListSettings";
import { createTask } from "./tasks-fns";
import "./ubh-task-form";
import UbhTaskForm from "./ubh-task-form";
import "./ubh-tasks-list";
import UbhTasksList from "./ubh-tasks-list";
import "./ubh-tasks-list-settings";

/**
 * Vista de tareas
 */
@customElement("ubh-tasks-view")
export default class UbhTasksView extends UbhComponent {
    @query('ubh-tasks-list')
    private list?: UbhTasksList;
    @query('ubh-task-form')
    private form?: UbhTaskForm;

    @state()
    private listSettings: ITasksListSettings | undefined;
    @state()
    private selectedTask: ITask | undefined;
    private selectedPending: ITask | undefined;

    /* Tratar evento de selección de tarea */
    private handleTaskSelected(event: CustomEvent) {
        this.form?.close();
        if (!this.form?.changed) {
            this.selectedTask = { ...event.detail } as ITask;
        } else {
            this.selectedPending = { ...event.detail } as ITask;
        }
    }

    /* Tratar evento de crear nueva tarea */
    private handleNewTask(_event: Event) {
        createTask(this.ctx).then(task => this.selectedTask = { ...task as ITask })
    }

    /* Tratar evento de recarga de la lista */
    private handleListReload(_event: Event) {
        this.selectedTask = undefined;
    }

    /* Tratar evento de guardar del formulario (cuando se guarda) */
    private handleFormSaved(event: CustomEvent) {
        if (event.target instanceof UbhTaskForm && event.detail) {
            this.list?.updateItem(event.detail as ITask);
        }
    }

    /* Tratar evento de cierre del formulario */
    private handleFormClosed(_event: Event) {
        if (this.selectedPending) {
            this.selectedTask = { ...this.selectedPending };
            this.selectedPending = undefined;
        }
    }

    /* Actualizar los parámetros de configuración de la lista */
    private updateListSettings(event: CustomEvent) {
        this.listSettings = { ...event.detail as ITasksListSettings };
        if (this.list) {
            this.list.settings = { ...this.listSettings }
            this.selectedTask = undefined;
            this.list.reload();
        }
    }

    /* Visualizar */
    protected render() {
        return html`
            <ubh-view>
                <section slot="list">
                    <ubh-tasks-list label="Tareas" hasSettings .settings=${this.listSettings}
                        @ubh-list-item-selected=${this.handleTaskSelected}
                        @ubh-list-item-add=${this.handleNewTask}
                        @ubh-list-reload=${this.handleListReload}
                    ></ubh-tasks-list>
                </section>
                <section slot="details">
                    <ubh-task-form
                        @ubh-close-details=${this.handleFormClosed}
                        @ubh-form-saved=${this.handleFormSaved}
                        .value=${this.selectedTask}
                    ></ubh-task-form>
                </section>
                <aside slot="settings">
                    <ubh-tasks-list-settings @ubh-list-settings-changed=${this.updateListSettings}>
                    </ubh-tasks-list-settings>
                </aside>
            </ubh-view>
        `;
    }

    static componentStyles = css`
        ubh-tasks-list {
            font-size: var(--sl-font-size-small);
        }

    `;

    static styles = [resetStyles, panelsStyles, UbhTasksView.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-tasks-view": UbhTasksView;
    }
}