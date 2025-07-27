import { consume } from "@lit/context";
import { customElement, property } from "lit/decorators.js";
import { SelectOption, UBHSelect } from "../base/ubh-select";
import { wappops, Wappops } from "../../application/wappops";
import { ICenter, IRoomRange } from "@model/data-model";

@customElement('ubh-room-range-select')
export class UBHRoomRangeSelect extends UBHSelect<IRoomRange>{
    @consume({ context: wappops })
    ctx!: Wappops;


    @property({type: Object})
    centers: ICenter | ICenter[] | undefined;

    protected getOptions(): Promise<IRoomRange[]>;
    protected getOptions(): IRoomRange[];
    protected getOptions(): IRoomRange[] | Promise<IRoomRange[]> {
        const centersIds = Array.isArray(this.centers)
            ? this.centers.map(c => c.id)           
            : this.centers
                ? [this.centers.id]
                : undefined;

        return this.ctx.db.roomsRanges
            .filter(a => !centersIds || centersIds.includes(a.center.id))
            .toArray()
            .then((ranges: IRoomRange[]) => {
                return ranges.sort((a: IRoomRange, b: IRoomRange) => {
                    if (a.center.code < b.center.code) return -1;
                    if (a.center.code > b.center.code) return 1;
                    if (a.name < b.name) return -1;
                    if (a.name > b.name) return 1;
                    return 0;
                });
            }
            );
    }

    protected mapToSelectOption(option: IRoomRange): SelectOption {
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
        'ubh-room-range-select': UBHRoomRangeSelect
    }
}