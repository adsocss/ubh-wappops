import { INotification, ITask } from "@model/data-model";
import { css, html, nothing } from "lit";
import { customElement, property, query} from "lit/decorators.js";
import UbhComponent from "../base/ubh-component";
import { iconStyles } from "../css/icons.css";
import { resetStyles } from "../css/reset.css";
import { tasksStyles } from "../css/tasks.css";

@customElement('ubh-task-notification-card')
export class UbhTaskNotificationCard extends UbhComponent {
    @query('sl-checkbox')
    private checkbox!: HTMLInputElement;

    @property({ type: Object })
    value: INotification | undefined = undefined;

    private handleReadChange(event: Event) {
        const checkbox = event.target as HTMLInputElement;
        if (this.value) {
            this.value.read = checkbox.checked;
            this.save();
        }
    }

    private toggleRead(event: Event) {
        if (this.value && event.target !== this.checkbox) {
            this.value.read = !this.value.read;
            this.save();
        }
    }

    private save() {
        if (this.value) {
            this.ctx.db.notifications.put(this.value)
                .then(() => {
                    this.requestUpdate();
                });
        }
    }

    protected render() {
        if (!this.value || this.value.topic !== 'tasks') {
            return nothing;
        }

        const task = this.value.data as ITask;

        return html`
            <div id="wrapper" class="${this.value.read ? 'read' : 'unread'}"
                    @click=${this.toggleRead}
                >
                <header>
                    <div class="row">
                        <sl-checkbox class="${this.value.read ? 'read' : 'unread'}"
                            @sl-change="${this.handleReadChange}" ?checked="${this.value.read}"
                        >
                            ${this.value.description}
                        </sl-checkbox>
                        <sl-relative-time .date="${this.value.timestamp ?? ''}" lang="es-ES"></sl-relative-time>
                    </div>
                    <div class="row">
                        <span> Nº ${task.number ?? '?'}</span>
                        <span class="status ${task.status.code}">${task.status.name}</span>
                    </div>
                </header>
                <sl-divider></sl-divider>
                <p id="task-description">${this.getTaskDescription(task)}</p>
            </div>
        `;
    }

    /* Descripción de la tarea dependiendo de si está o no en blanco */
    private getTaskDescription(task: ITask) {
        if (!task.description || task.description.trim() === '') {
            return task.taskType.name;
        }

        return this.formatDescription(task.description);
    }

    /** Reformatear la descripción eliminando los tags de HTML */
    private formatDescription(text: string) {
        const temp = document.createElement('div');
        temp.innerHTML = text?.toString() ?? '';
        return (temp.textContent || temp.innerText || '').trim();
    }

    static componentsStyles = css`
    #wrapper {
        display: flex;
        flex-direction: column;
        gap: var(--sl-spacing-small);            
        background-color: var(--sl-color-neutral-0);
        border: 1px solid var(--sl-color-neutral-200);
        border-radius: var(--sl-border-radius-medium);            
        padding: var(--sl-spacing-x-small);
        width: 100%;
        font-size: var(--sl-font-size-small);
    }

    header {
        display: flex;
        flex-direction: column;
        gap: var(--sl-spacing-x-small);
    }

    #wrapper.unread {
        font-weight: bold;
    }

    sl-checkbox.unread::part(label) {
        font-weight: bold;
    }

    .description {
        display: flex;
        align-items: center;
        gap: var(--sl-spacing-x-small);
        font-weight: 600;
    }

    .description svg {
        fill: var(--sl-color-primary-800);
    }

    .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
    }

    .status {
        font-size: 90%;
        font-weight: bold;
        text-transform: uppercase;
    }

    #task-description {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    `;

    static styles = [
        resetStyles, iconStyles, tasksStyles, UbhTaskNotificationCard.componentsStyles
    ]
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-task-notification-card': UbhTaskNotificationCard;
    }
}   