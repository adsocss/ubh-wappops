import { html, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ICenter, IReservation, IRoom } from "@model/data-model";
import UbhList from "../base/ubh-list";
import "./ubh-reservation-card";

export interface IReservationListItem extends IReservation {
    room: IRoom | undefined
}

@customElement("ubh-reservations-list")
export class UbhReservationsList extends UbhList<IReservationListItem> {
    private _room?: IRoom;

    @property({ type: Object })
    center?: ICenter
    @property({ type: Object })
    set room(value: IRoom | undefined) {
        this._room = value === undefined ? undefined : { ...value };
        this.load()
            .then((items) => {
                this.items = items;
                this.requestUpdate();
            });
    }
    get room(): IRoom | undefined {
        return this._room;
    }

    constructor() {
        super();
        // Configurar como lista exlusivamente de consulta.
        this.canAdd = false;
        this.canConfigure = false;
        this.canReload = false;
        this.canSearch = false;
        this.hasSettings = false
    }

    protected async load(): Promise<IReservationListItem[]> {
        const res = await this.ctx?.db.booking.toArray() ?? [];
        const items = res.map(async (r) => {
            const room = await this.ctx.db.rooms.get(r.roomId);
            return {...r, room } as IReservationListItem;
        });

        const result = (await Promise.all(items))
            .filter((item) => this.filter(item))
            .sort((a, b) => {
                if (a.arrival < b.arrival) {
                    return -1;
                }
                
                if (a.arrival > a.arrival) {
                    return 1;
                }

                return 0;
            });

        return result as IReservationListItem[];
    }

    /**
     * Filtra los elementos de la lista según el centro o la habitación seleccionada.
     * La habitación tiene prioridad sobre el centro.
     */
    private filter(item: IReservationListItem): boolean {
        if (this.room) {
            return item.room?.id === this.room.id;
        }

        if (this.center) {
            return item.room?.center.id === this.center.id;
        }

        return true;
    }

    public async reload(): Promise<void> { 
        this.load();
    }

    protected renderItem(item: IReservationListItem): TemplateResult {
        return html`
            <ubh-reservation-card .value=${item}></ubh-reservation-card>
        `;
    }
    public updateItem(_item: IReservationListItem): void {
        throw new Error("Método no soportado");
    }
    protected matchesSearch(_item: IReservationListItem): boolean {
        return true
    }
    protected handleEditSettings(): void {
        // Nada: no ha filtros para esta lista.
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-reservations-list": UbhReservationsList;
    }
}