import { consume } from "@lit/context";
import { customElement } from "lit/decorators.js";
import { wappops, Wappops } from "../../application/wappops";
import { UBHSelect, SelectOption } from "../base/ubh-select";
import { ICenter } from "@model/data-model";

/**
 * Selección de Centro
 */
@customElement('ubh-center-select')
export class UBHCenterSelect extends UBHSelect<ICenter> {
    @consume({ context: wappops })
    ctx!: Wappops;

    protected override getOptions(): Promise<ICenter[]>;
    protected override getOptions(): ICenter[];
    protected override getOptions(): ICenter[] | Promise<ICenter[]> {
        return this.ctx.db.centers.toArray();
    }

    protected mapToSelectOption(option: ICenter): SelectOption {
        return {
            value: option.id.toString(),
            description: option.name
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-center-select': UBHCenterSelect
    }
}