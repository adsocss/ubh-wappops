import { consume } from "@lit/context";
import { customElement, property } from "lit/decorators.js";

import { PropertyValues } from "lit";
import { UBHSelect, SelectOption } from "../base/ubh-select";
import { IRoom, ICenter } from "@model/data-model";
import { wappops, Wappops } from "../../application/wappops";

@customElement('ubh-room-select')
export class UBHRoomSelect extends UBHSelect<IRoom>{
    @consume({ context: wappops })
    ctx!: Wappops;

    @property({type: Object})
    center: ICenter | undefined;

    protected getOptions(): Promise<IRoom[]>;
    protected getOptions(): IRoom[];
    protected getOptions(): IRoom[] | Promise<IRoom[]> {
        return this.ctx.db.rooms
            .filter(a => this.center === undefined || a.center.id === this.center.id)
            .toArray()
    }

    protected mapToSelectOption(option: IRoom): SelectOption {
        return {
            value: option.id.toString(),
            description: option.number
        }
    }

    protected willUpdate(_changedProperties: PropertyValues): void {
        super.willUpdate(_changedProperties);
        if (this.center) {
            this.getOptions().then(options => this.options = options);
        };
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-room-select': UBHRoomSelect
    }
}