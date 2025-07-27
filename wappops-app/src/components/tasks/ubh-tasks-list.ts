import UbhList, { EVT_LIST_ITEM_SELECTED } from "../base/ubh-list";
import { IRoom, ITask } from "@model/data-model";
import { html, TemplateResult } from "lit";
import { customElement, property, queryAll } from "lit/decorators.js";
import { ITasksListSettings } from "./ITaskListSettings";
import "./ubh-task-card";
import UbhTaskCard from "./ubh-task-card";
import { getDefaultSettings } from "./ubh-tasks-list-settings";


@customElement("ubh-tasks-list")
export default class UbhTasksList extends UbhList<ITask> {
    @queryAll("ubh-task-card")
    private cards!: NodeListOf<UbhTaskCard>;

    @property({ type: Object })
    settings: ITasksListSettings | undefined;

    protected async load(): Promise<ITask[]> {
        if (!this.settings) {
            this.settings = await getDefaultSettings(this.ctx);
        }

        const centersIds = this.settings?.filter.centers?.map(c => c.id);
        const departmentsIds = this.settings?.filter.departments?.map(d => d.id);
        const statusesIds = this.settings?.filter.statuses?.map(s => s.id);
        const prioritiesIds = this.settings?.filter.priorities?.map(p => p.id);
        const targetTypesIds = this.settings?.filter.targetTypes?.map(t => t.id);

        const data =  await this.ctx.db.tasks
            .filter(task => centersIds?.includes(task.center.id) ?? true)
            .filter(task => departmentsIds?.includes(task.department.id) ?? true)
            .filter(task => statusesIds?.includes(task.status.id) ?? true)
            .filter(task => prioritiesIds?.includes(task.priority.id) ?? true)
            .filter(task => targetTypesIds?.includes(task.targetType.id) ?? true)
            .filter(task => this.matchesSearch(task))
            .sortBy(this.settings?.sort.field ?? 'notifiedOn')
            .then(tasks => {
                return this.settings?.sort.order === 'descending' ? tasks.reverse() : tasks;
            })
            ;

        return data;
    }

    /* Tratar evento de selección de elemento de la lista */
    private handleItemSelected(event: CustomEvent) {
        this.cards.forEach(card => {
            card.selected = card.value?.id === event.detail.id;
        });
        this.requestUpdate();
    }

    protected renderItem(item: ITask): TemplateResult {
        return html`
            <ubh-task-card .value=${item}></ubh-task-card>
        `;
    }

    /*
     * Actualizar la información del elemento de la lista
     * Si no estaba en ella, se carga desde la B.D.
     */
    public async updateItem(item: ITask) {
        let listItem = this.items.find(i => i.id === item.id);
        if (listItem) {
            listItem = item;
            this.cards.forEach(card => {
                if (card.value?.id === item.id) {
                    card.value = item;
                    card.requestUpdate();
                }
            });
        } else {
            listItem = await this.ctx.db.tasks.get(item.localId);
            if (listItem) {
                this.items.push(listItem);
                this.requestUpdate();
            }
        }
    }

    protected matchesSearch(item: ITask): boolean {
        const term = this.searchValue ?? '';

        if (term.length === 0) {
            return true;
        }

        if (this.normalizeSearchTerm(item.number).startsWith(term)) {
            return true;
        }

        if (item.targetType?.code === 'room') {
            const room = item.taskTarget as IRoom;
            if (this.normalizeSearchTerm((room?.number))?.startsWith(term)) {
                return true;
            }
        }

        if (this.normalizeSearchTerm(item.description, true).includes(term)) {
            return true;
        }

        return false;
    }

    connectedCallback(): void {
        super.connectedCallback();
        this.addEventListener(EVT_LIST_ITEM_SELECTED, this.handleItemSelected.bind(this) as EventListener);
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.removeEventListener(EVT_LIST_ITEM_SELECTED, this.handleItemSelected as EventListener);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-tasks-list": UbhTasksList;
    }
}