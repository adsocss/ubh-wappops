import { customElement, property } from "lit/decorators.js";
import { SelectOption, UBHSelect } from "../base/ubh-select";
import { PropertyValues } from "lit";
import { consume } from "@lit/context";
import { ITaskType, IDepartment } from "@model/data-model";
import { wappops, Wappops } from "../../application/wappops";

@customElement('ubh-tasktype-select')
export class UBHTaskTypeSelect extends UBHSelect<ITaskType> {
    @consume({ context: wappops })
    ctx!: Wappops;

    @property({ type: Object})
    department: IDepartment | undefined = undefined;

    protected getOptions(): Promise<ITaskType[]>;
    protected getOptions(): ITaskType[];
    protected getOptions(): ITaskType[] | Promise<ITaskType[]> {
        return this.ctx.db.tasksTypes
            .filter(tt => this.filter(tt.department))
            .toArray();
    }

    /* Filtrar por departamento si se ha establecido esta propiedad */
    private filter(department: IDepartment): boolean {
        if (!this.department) return false;

        return department.id === this.department.id;
    }

    protected mapToSelectOption(option: ITaskType): SelectOption {
        return {
            value: option.id.toString(),
            description: option.name
        }
    }

    protected willUpdate(_changedProperties: PropertyValues): void {
        super.willUpdate(_changedProperties);
        if (this.department) {
            this.getOptions().then(options => this.options = options);
        };
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-tasktype-select': UBHTaskTypeSelect
    }
}