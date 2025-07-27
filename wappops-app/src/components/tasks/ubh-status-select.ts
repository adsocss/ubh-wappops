import { consume } from "@lit/context";
import { customElement, property } from "lit/decorators.js";
import { SelectOption, UBHSelect } from "../base/ubh-select";
import { ITaskEnum } from "@model/data-model";
import { wappops, Wappops } from "../../application/wappops";

type TaskStatus = ITaskEnum<'status'>;

@customElement('ubh-status-select')
export class UBHStatusSelect extends UBHSelect<TaskStatus> {
    @consume({ context: wappops })
    ctx!: Wappops;

    @property({ type: Boolean })
    includeClosed: boolean = false;

    protected getOptions(): Promise<TaskStatus[]>;
    protected getOptions(): TaskStatus[];
    protected getOptions(): TaskStatus[] | Promise<TaskStatus[]> {
        // Si no se ha establecido un valor por defecto explícito,
        // usar el del Pseudo-tipo enumerado.
        if (!this.hasValue(this.defaultValue)) {
            this.ctx.db.tasksEnums
                .filter(e => e.type === 'status' && e.isDefault === true)
                .first()
                .then(e => this.defaultValue = e);
        }

        // Devolver todos los estados
        if (this.includeClosed) {
            return this.ctx.db.tasksEnums.filter(e => e.type === 'status')
                .toArray();
        }

        // Devolver solo los estados distintos del de tarea finalizada.
        // Se reserva el estado de tarea finalizada para una acción específica
        // en el formulario de tarea.
        return this.ctx.db.tasksEnums.filter(e => e.type === 'status' && e.code !== 'closed')
            .toArray();
    }

    protected mapToSelectOption(option: TaskStatus): SelectOption {
        return {
            value: option.id.toString(),
            description: option.name
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-status-select': UBHStatusSelect
    }
}