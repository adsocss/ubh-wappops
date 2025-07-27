import { SlDrawer } from "@shoelace-style/shoelace";
import { html, TemplateResult } from "lit";
import { customElement, query, queryAll, state } from "lit/decorators.js";
import UbhList, { EVT_LIST_ITEM_SELECTED } from "../base/ubh-list";
import { getArrivalsCount, getDeparturesCount, getPendingTasksCount, IRoomInfo, isOccupied } from "../centers/IRoomInfo";
import { IRoomStatusListSettings } from "./IRoomStatusListSettings";
import { UbhRoomStatusCard } from "./ubh-room-status-card";
import "./ubh-room-status-card";
import { getDefaultSettings } from "./ubh-rooms-status-list-settings";

@customElement('ubh-rooms-status-list')
export class UbhRoomsStatusList extends UbhList<IRoomInfo> {
    @queryAll('ubh-room-status-card')
    private cards!: NodeListOf<UbhRoomStatusCard>;
    @query('#settings-drawer')
    private settingsDrawer?: SlDrawer;

    @state()
    public settings: IRoomStatusListSettings | undefined = undefined;

    protected async load(): Promise<IRoomInfo[]> {

        if (!this.settings) {
            this.settings = await getDefaultSettings(this.ctx);
        }

        const centersIds = this.settings?.centers?.map(c => c.id);
        const blocksIds = this.settings?.blocks?.map(b => b.id);
        const floorsIds = this.settings?.floors?.map(f => f.id);
        const rangesIds = this.settings?.ranges?.map(r => r.id);

        const rooms = await this.ctx.db.rooms
            .filter(room => centersIds?.includes(room.center.id) ?? true)
            .filter(room => blocksIds?.includes(room.block?.id ?? -1) ?? true)
            .filter(room => floorsIds?.includes(room.floor?.id ?? -1) ?? true)
            .filter(room => rangesIds?.includes(room.range?.id ?? -1) ?? true)
            .filter(room => this.matchesSearch(room))
            .filter(room => {
                if (this.settings?.status === undefined) return true;
                if (this.settings?.status === 'clean' && room.clean) return true;
                if (this.settings?.status === 'dirty' && !room.clean) return true;

                return false;
            })
            .toArray();

        const roomsInfo = await Promise.all( rooms.map(async room => {
                return {
                    ...room,
                    pendingTasksCount: await getPendingTasksCount(this.ctx, room),
                    arrivalsCount: await getArrivalsCount(this.ctx, room),
                    departuresCount: await getDeparturesCount(this.ctx, room),
                    isOccupied: await isOccupied(this.ctx, room),
                } as IRoomInfo;
            }));

        return roomsInfo.filter(item => this.filterWithOptions(item));
    }

    /* Tratar evento de selección de elemento de la lista */
    private handleItemSelected(event: CustomEvent) {
        this.cards.forEach(card => {
            card.selected = card.value?.id === event.detail.id;
        });
        this.requestUpdate();
    }

    private filterWithOptions(item: IRoomInfo): boolean {
        const hasTasks = (item.pendingTasksCount ?? 0) > 0;
        const hasArrivals = (item.arrivalsCount ?? 0) > 0;
        const hasDepartures = (item.departuresCount ?? 0) > 0;


        if (this.settings?.withPendingTasks === true && !hasTasks) {
            return false;
        }

        if (this.settings?.withArrivals === true && this.settings?.withDepartures === true) {
            return hasArrivals || hasDepartures;
        }

        if (this.settings?.withArrivals === true && !hasArrivals) {
            return false;
        }

        if (this.settings?.withDepartures === true && !hasDepartures) {
            return false;
        }

        return true;
    }

    protected renderItem(item: IRoomInfo): TemplateResult {
        return html`
            <ubh-room-status-card .value=${item as any}></ubh-room-status-card>
        `;
    }

    public updateItem(_item: IRoomInfo): void {
        // Nada: gestionado por el componente 'ubh-room-card'
    }

    protected matchesSearch(item: IRoomInfo): boolean {
        const term = (this.searchValue ?? '').trim().toLowerCase();
        if (term.length === 0) {
            return true;
        }

        if (this.searchFieldValue(item.number).startsWith(term)) {
            return true;
        }

        if (this.searchFieldValue(item.block?.name).includes(term)) {
            return true;
        }

        if (this.searchFieldValue(item.floor?.name).includes(term)) {
            return true;
        }

        if (this.searchFieldValue(item.range?.name).includes(term)) {
            return true;
        }

        return false;
    }

    /* Normalizar valor de campo para comparar con el término de búsqueda */
    private searchFieldValue(fieldValue: string | number | undefined) {
        if (!fieldValue) {
            return '';
        }

        return (fieldValue ?? '').toString().trim().toLowerCase();
    }

    /* Tratar evento de cambio de la configuración de la lista */
    protected handleEditSettings(): void {
        if (this.settingsDrawer) {
            this.settingsDrawer.show();
        }
        return;
    }

    /* Tratar evento de cambio de la configuración de la lista */
    private handleSettingsChanged(event: CustomEvent) {
        this.settings = event.detail;
        this.settingsDrawer?.hide();
        this.load();
    }

    connectedCallback(): void {
        super.connectedCallback();
        this.addEventListener(EVT_LIST_ITEM_SELECTED, this.handleItemSelected.bind(this) as EventListener);
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.removeEventListener(EVT_LIST_ITEM_SELECTED, this.handleItemSelected as EventListener);
    }

    /* Visualizar */
    protected override render() {
        return html`
            ${super.render()};
            <sl-drawer id="settings-drawer" placement="end" label="Filtros de la lista">
                <ubh-rooms-status-list-settings @settings-changed="${this.handleSettingsChanged}"
                     .settings="${this.settings}">
                </ubh-rooms-status-list-settings>
            </sl-drawer>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-rooms-status-list': UbhRoomsStatusList
    }
}