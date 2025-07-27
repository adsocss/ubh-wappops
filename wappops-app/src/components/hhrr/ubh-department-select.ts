import { UBHSelect, SelectOption } from "../base/ubh-select";
import { consume } from "@lit/context";
import { IDepartment } from "@model/data-model";
import { customElement, property } from "lit/decorators.js";
import { wappops, Wappops } from "../../application/wappops";

@customElement('ubh-department-select')
export class UbhDepartmentSelect extends UBHSelect<IDepartment> {
    @consume({ context: wappops })
    ctx!: Wappops;

    @property()
    mode: 'all' | 'with-task-types' = 'all';

    protected getOptions(): Promise<IDepartment[]>;
    protected getOptions(): IDepartment[];
    protected getOptions(): IDepartment[] | Promise<IDepartment[]> {
        if (this.mode === 'with-task-types') {
            return this.ctx.db.tasksTypes.toArray()
                .then(types => types.map(type => type.department))
                .then(departments => {
                    const unique: Map<number,IDepartment> = new Map();
                    departments.forEach(d => unique.set(d.id, d));

                    return [... unique.values()];
                });
        }

        return this.ctx.db.departments.toArray();
    }

    protected mapToSelectOption(option: IDepartment): SelectOption {
        return {
            value: option.id.toString(),
            description: option.name
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-deparment-select': UbhDepartmentSelect
    }
}