import { consume } from "@lit/context";
import { customElement, property } from "lit/decorators.js";
import { ICenter, ICenterBlock } from "@model/data-model";
import { SelectOption, UBHSelect } from "../base/ubh-select";
import { wappops, Wappops } from "../../application/wappops";

@customElement('ubh-block-select')
export class UBHBlockSelect extends UBHSelect<ICenterBlock> {
    @consume({ context: wappops })
    ctx!: Wappops;

    @property({ type: Object })
    centers: ICenter | ICenter[] | undefined;

    protected getOptions(): Promise<ICenterBlock[]>;
    protected getOptions(): ICenterBlock[];
    protected getOptions(): ICenterBlock[] | Promise<ICenterBlock[]> {
        const centerIds = this.centers ? (Array.isArray(this.centers) ? this.centers : [this.centers]).map(c => c.id) : undefined;
        return this.ctx.db.blocks
            .filter(a => !centerIds || centerIds.includes(a.center.id)).toArray()
            .then((blocks: ICenterBlock[]) => {
                return blocks.sort((a: ICenterBlock, b: ICenterBlock) => {
                    if (a.center.code < b.center.code) return -1;
                    if (a.center.code > b.center.code) return 1;
                    if (a.name < b.name) return -1;
                    if (a.name > b.name) return 1;
                    return 0;
                });
            })
            ;
    }

    protected mapToSelectOption(option: ICenterBlock): SelectOption {
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
        'ubh-block-select': UBHBlockSelect
    }
}