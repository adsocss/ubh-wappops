import { consume } from "@lit/context";
import { customElement, property } from "lit/decorators.js";
import { PropertyValues } from "lit";
import { UBHSelect, SelectOption } from "../base/ubh-select";
import { ICenterLocation, ICenter } from "@model/data-model";
import { wappops, Wappops } from "../../application/wappops";

@customElement('ubh-location-select')
export class UBHLocationSelect extends UBHSelect<ICenterLocation>{
    @consume({ context: wappops })
    ctx!: Wappops;

    @property({type: Object})
    center: ICenter | undefined;

    protected getOptions(): Promise<ICenterLocation[]>;
    protected getOptions(): ICenterLocation[];
    protected getOptions(): ICenterLocation[] | Promise<ICenterLocation[]> {
        return this.ctx.db.locations
            .filter(a => this.center === undefined || a.center.id === this.center.id)
            .toArray()
    }

    protected mapToSelectOption(option: ICenterLocation): SelectOption {
        return {
            value: option.id.toString(),
            description: option.name
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
        'ubh-location-select': UBHLocationSelect
    }
}