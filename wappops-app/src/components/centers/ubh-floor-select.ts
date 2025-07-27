import { UBHSelect, SelectOption } from "../base/ubh-select";
import { consume } from "@lit/context";
import { IFloor, ICenter } from "@model/data-model";
import { customElement, property } from "lit/decorators.js";
import { wappops, Wappops } from "../../application/wappops";

@customElement('ubh-floor-select')
export class UBHFloorSelect extends UBHSelect<IFloor> {
    @consume({ context: wappops })
    ctx!: Wappops;

    @property({ type: Object })
    centers: ICenter | ICenter[] | undefined;

    protected getOptions(): Promise<IFloor[]>;
    protected getOptions(): IFloor[];
    protected getOptions(): IFloor[] | Promise<IFloor[]> {
        const centersIds = Array.isArray(this.centers)
            ? this.centers.map(c => c.id)
            : this.centers
                ? [this.centers.id]
                : undefined;

        return this.ctx.db.floors
            .filter(a => !centersIds || centersIds.includes(a.center.id))
            .toArray()
            .then((floors: IFloor[]) => {
                return floors.sort((a: IFloor, b: IFloor) => {
                    if (a.center.code < b.center.code) return -1;
                    if (a.center.code > b.center.code) return 1;
                    if (a.name < b.name) return -1;
                    if (a.name > b.name) return 1;
                    return 0;
                });
            });
    }

    protected mapToSelectOption(option: IFloor): SelectOption {
        const description = this.showCenterCode()
            ? `[${option.center.code}] - ${option.name}`
            : `${option.name}`;

        return {
            value: option.id.toString(),
            description: description
        }
    }

    private showCenterCode(): boolean {
        if (!this.centers) {
            return (this.ctx.currentUser?.authorizations.centerIds ?? []).length > 1;
        }

        if (this.centers instanceof Array && this.centers.length > 1) {
            return true;
        }

        return false;
    }

    public reloadOptions(): void {
        this.load();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-floor-select': UBHFloorSelect
    }
}