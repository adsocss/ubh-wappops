import { ICounterRecord, IResourceCounter } from "@model/data-model";
import { html } from "lit";
import { customElement, property, queryAll } from "lit/decorators.js";
import UbhList, { EVT_LIST_ITEM_SELECTED } from "../base/ubh-list";
import { getCounterListItem, getCountersListItems } from "./counters-fns";
import "./ubh-counter-card";
import UbhCounterCard from "./ubh-counter-card";
import { ICountersListSettings } from "./ICountersListSettings";
import { getDefaultSettings } from "./ubh-counters-list-settings";

export type CountersListItem = {
    counter: IResourceCounter
    records: ICounterRecord[]
}

@customElement('ubh-counters-list')
export default class UbhCountersList extends UbhList<CountersListItem> {
    @queryAll("ubh-counter-card")
    private cards!: NodeListOf<UbhCounterCard>;

    @property({ type: Object })
    settings: ICountersListSettings | undefined;

    protected async load(): Promise<CountersListItem[]> {
        if (!this.settings) {
            this.settings = await getDefaultSettings(this.ctx);
        }

        return (await getCountersListItems(this.ctx))
            .filter(item => {
                const centersIds = this.settings?.filter.centers?.map(c => c.id);
                return centersIds?.includes(item.counter.center.id) ?? true;
            })
            .filter(item => this.matchesSearch(item));
    }

    /* Tratar evento de selección de elemento de la lista */
    private handleItemSelected(event: CustomEvent) {
        this.cards.forEach(card => {
            card.selected = card.value?.counter.id === event.detail.counter?.id;
        });
        this.requestUpdate();
    }

    protected renderItem(item: CountersListItem) {
        return html`
            <ubh-counter-card .value=${item as any}></ubh-counter-card>
        `;
    }

    public async updateItem(item: CountersListItem) {
        let listItem = this.items.find(i => i.counter.id === item.counter.id);
        if (listItem) {
            listItem = item;
            this.cards.forEach(card => {
                if (card.value?.counter.id === item.counter.id) {
                    card.value = item;
                    card.requestUpdate();
                }
            });
        } else {
            listItem = await getCounterListItem(this.ctx, item.counter);
            if (listItem) {
                this.items.push(listItem);
                this.requestUpdate();
            }
        }
    }


    protected matchesSearch(item: CountersListItem): boolean {
        const term = this.searchValue ?? '';

        if (term.length === 0) {
            return true;
        }

        return (this.normalizeSearchTerm(item.counter.name, false).includes(term)) 
    }

    protected handleEditSettings(): void {
        throw new Error("Method not implemented.");
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
        'ubh-counters-list': UbhCountersList;
    }
}   