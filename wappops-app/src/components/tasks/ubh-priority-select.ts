import { customElement } from "lit/decorators.js";
import { ITaskEnum } from "@model/data-model";
import { SelectOption, UBHSelect } from "../base/ubh-select";
import { consume } from "@lit/context";
import { Wappops, wappops } from "../../application/wappops";

type TaskPriority = ITaskEnum<'priority'>;

@customElement('ubh-priority-select')
export class UBHPrioritySelect extends UBHSelect<TaskPriority> {
    @consume({ context: wappops })
    ctx!: Wappops;

    protected getOptions(): Promise<TaskPriority[]>;
    protected getOptions(): TaskPriority[];
    protected getOptions(): TaskPriority[] | Promise<TaskPriority[]> {
        // Si no se ha establecido un valor por defecto explícito,
        // usar el del Pseudo-tipo enumerado.
        if (!this.hasValue(this.defaultValue)) {
            this.ctx.db.tasksEnums
                .filter(e => e.type === 'priority' && e.isDefault === true)
                .first()
                .then(e => this.defaultValue = e);
        }

        return this.ctx.db.tasksEnums.filter(e => e.type === 'priority')
            .toArray();
    }

    protected mapToSelectOption(option: TaskPriority): SelectOption {
        return {
            value: option.id.toString(),
            description: option.name
        }
    }
 }

declare global {
    interface HTMLElementTagNameMap {
        'ubh-priority-select': UBHPrioritySelect
    }
}