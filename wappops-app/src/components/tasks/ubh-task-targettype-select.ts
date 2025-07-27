import { consume } from "@lit/context";
import { customElement, property } from "lit/decorators.js";
import { SelectOption, UBHSelect } from "../base/ubh-select";
import { ITaskEnum, ICenter } from "@model/data-model";
import { wappops, Wappops } from "../../application/wappops";

type TaskTargetType = ITaskEnum<'target-type'>;

@customElement('ubh-task-targettype-select')
export class UBHTaskTargetTypeSelect extends UBHSelect<TaskTargetType> {
    @consume({ context: wappops })
    ctx!: Wappops;

    @property({ type: Object })
    center: ICenter | undefined = undefined;

    private countsComputed = false;
    private assetsCount: number = 0;
    private locationsCount: number = 0;
    private roomsCount: number = 0;

    protected getOptions(): Promise<TaskTargetType[]>;
    protected getOptions(): TaskTargetType[];
    protected getOptions(): TaskTargetType[] | Promise<TaskTargetType[]> {
        // Si no se ha establecido un valor por defecto explícito,
        // usar el del Pseudo-tipo enumerado.   
        if (!this.hasValue(this.defaultValue)) {
            this.ctx.db.tasksEnums
                .filter(tt => tt.type === 'target-type' && tt.isDefault === true)
                .first()
                .then(tt => this.defaultValue = tt);
        }
        
        return this.countTargets()
            .then(() => this.ctx.db.tasksEnums
                .filter(tt => tt.type === 'target-type').toArray())
            .then(tts => tts.filter(tt => this.filter(tt)))
    }

    protected mapToSelectOption(option: TaskTargetType): SelectOption {
        return {
            value: option.id.toString(),
            description: option.name
        }
    }

    /* Filtrar en base a la existencia de cada tipo de objeto de tarea en la BD */
    private filter(targetType: TaskTargetType): boolean {
        if (targetType.code === 'asset') {
            return this.assetsCount > 0;
        }

        if (targetType.code === 'location') {
            return this.locationsCount > 0;
        }

        if (targetType.code === 'room') {
            return this.roomsCount > 0;
        }

        return true;
    }

    /*
     * Obtener el número de registros en la BD de cada uno
     * de los objetos de tarea.
     */
    private async countTargets() {
        if (!this.countsComputed) {
            await this.countAssets()
                .then(count => this.assetsCount = count)
                .then(() => this.countLocations())
                .then(count => this.locationsCount = count)
                .then(() => this.countRooms())
                .then(count => this.roomsCount = count)
                .then(() => this.countsComputed = true)
                ;
        }
    }

    /*
     * Obtener el número de activos fijos del centro establecido
     * en la propiedad 'center', si se ha establecido, de lo
     * contrario, se devuelven los de todos los centros.
     */
    private async countAssets(): Promise<number> {
        return await this.ctx.db.assets
            .filter(a => this.center === undefined || a.center.id === this.center.id)
            .count();
    }

    /*
     * Obtener el número de ubicaciones del centro establecido
     * en la propiedad 'center', si se ha establecido, de lo
     * contrario, se devuelven las de todos los centros.
     */
    private async countLocations(): Promise<number> {
        return await this.ctx.db.locations
            .filter(a => this.center === undefined || a.center.id === this.center.id)
            .count();
    }

    /*
     * Obtener el número de habitaciones del centro establecido
     * en la propiedad 'center', si se ha establecido, de lo
     * contrario, se devuelven las de todos los centros.
     */
    private async countRooms(): Promise<number> {
        return await this.ctx.db.rooms
            .filter(a => this.center === undefined || a.center.id === this.center.id)
            .count();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-task-targettype-select': UBHTaskTargetTypeSelect
    }
}