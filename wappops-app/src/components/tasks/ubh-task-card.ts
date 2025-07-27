import { IAsset, ICenterLocation, IRoom, ITask } from "@model/data-model";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { IListCard } from "../base/ILIstCard";
import UbhComponent from "../base/ubh-component";
import { EVT_LIST_ITEM_SELECTED } from "../base/ubh-list";
import { uploadOutlineIcon } from "../common/icons";
import { resetStyles } from "../css/reset.css";
import { tasksStyles } from "../css/tasks.css";

@customElement('ubh-task-card')
export default class UbhTaskCard extends UbhComponent implements IListCard<ITask> {
    @property({ type: Boolean })
    selected: boolean = false;
    @property({ type: Boolean })
    selectable: boolean = true;
    @property({ type: Boolean })
    canFinishTask: boolean = false;
    @property({ type: Object })
    value: ITask | undefined = undefined;

    equals(other: IListCard<ITask>): boolean {
        return this.value?.id === other.value?.id;
    }

    public updateValue(): void {
        this.ctx.db.tasks
            .get(this.value?.id)
            .then((task) => {
                this.value = task;
                this.requestUpdate();
            });
    }

    /* Tratar evento de selección (click) */
    private handleClick(_event: Event) {
        if (this.selectable) {
            this.selected = true;
            this.dispatchEvent(new CustomEvent(EVT_LIST_ITEM_SELECTED, { bubbles: true, composed: true, detail: this.value }));
        }
    }

    /* Visualizar */
    protected render() {
        if (!this.value) {
            return nothing;
        }

        const refDate = (this.value?.createdOn ?? this.value?.notifiedOn)?.toISOString();
        const classes = ((this.selected ? 'selected' : '') + ' ' + (this.selectable ? 'selectable' : '')).trim();

        return !this.value
            ? nothing
            : html`
                <div id="wrapper" class=${classes} @click=${this.handleClick}>
                    <div id="left" class="priority ${this.value.priority.code}">${this.value.priority.name}</div>
                    <div id="right">
                        <header>
                            <div class="row">
                                <span class="highlight">${this.value.center.name}</span>
                                <div id="sync-status">${this.value.syncStatus === 'pending' ? uploadOutlineIcon : nothing}</div>
                            </div>
                            <div class="row">
                                <span class="highlight">${this.getSubtitle() ?? nothing}</span>
                                <sl-relative-time date="${refDate ?? ''}" lang="es-ES"></sl-relative-time>
                            </div>
                            <div class="row">
                                <span>Nº ${this.value.number ?? '?'}</span>
                                <div>
                                    <div class="status ${this.value.status.code}">${this.value.status.name}</div>
                                </div>
                            </div>
                            <div>
                                <span id="department">Departamento: ${this.value.department?.name ?? 'no especificado'}</span>
                            </div>
                        </header>
                        <sl-divider></sl-divider>
                        <section>
                            ${this.formatDescription()}
                        </section>
                    </div>
                </div>
            `;
    }

    /* Devuelve el subtítulo dependiendo del objeto de la tarea */
    private getSubtitle() {
        if (!this.value?.targetType || !this.value?.taskTarget) {
            return this.value?.taskType.name;
        }

        switch (this.value?.targetType.code) {
            case 'asset': return (this.value.taskTarget as IAsset).name;
            case 'location': return (this.value.taskTarget as ICenterLocation).name;
            case 'room': return `Hab. ${(this.value.taskTarget as IRoom).number}`;
            default: return undefined;
        }
    }

    /*
    * Reformatear la descripción eliminando los tags de HTML
    * Si no hay descripción, se usa el nombre del tipo de tarea.
    */
    private formatDescription() {
        let text = (this.value?.description ?? '').trim();
        if (!text) {
            text = this.value?.taskType?.name ?? '';
        }

        const temp = document.createElement('div');
        temp.innerHTML = text?.toString() ?? '';
        return (temp.textContent || temp.innerText || '').trim();
    }


    // Estilos CSS específicos de este componente.
    static componentStyles = css`
        #wrapper {
            display: flex;
            gap: var(--sl-spacing-x-small);            
            background-color: var(--sl-color-neutral-0);
            border: 1px solid var(--sl-color-neutral-200);
            border-radius: var(--sl-border-radius-medium);            
            width: 100%;
        }

        #wrapper:hover {
            background-color: var(--sl-color-primary-100);
        }

        #wrapper.selected {
            background-color: var(--sl-color-primary-200);
        }

        .selectable {
            cursor: pointer;
        }

        .priority {
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
            writing-mode: sideways-lr;
            text-orientation: upright;
            padding: 0 0.5rem 0 0.5rem;
            width: fit-content;
        }

        #right {
            width: 100%;
            padding: var(--sl-spacing-x-small);
        }

        #sync-status svg {
            fill: var(--sl-color-danger-700);
        }

        header {
            display: flex;
            flex-direction: column;
        }

        sl-divider {
            margin: 0.5em 0 0.5rem 0;
        }

        section {
            display: flex;
        }

        .row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
        }

        sl-badge::part(base) {
            font-size: 90%;
            padding: 0.4rem 0.5rem;
        }

        .status {
            font-size: 90%;
            font-weight: bold;
            text-transform: uppercase;
        }

        #department {
            font-size: 90%;
        }

        .highlight {
            font-weight: bold;
        }
    `;

    static styles = [resetStyles, tasksStyles, UbhTaskCard.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-task-card': UbhTaskCard
    }
}

