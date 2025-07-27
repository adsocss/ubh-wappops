import { ICenter, IDepartment, ITaskEnum } from "@model/data-model";

/**
 * Parámetros de configuración de la lista de tareas.
 */
export interface ITasksListSettings {
    filter: {
        centers: ICenter[] | undefined;
        departments: IDepartment[] | undefined;
        targetTypes: ITaskEnum<'target-type'>[] | undefined;
        statuses: ITaskEnum<'status'>[] | undefined;
        priorities: ITaskEnum<'priority'>[] | undefined;
    },
    sort: {
        field: 'startedOn' | 'notifiedOn',
        order: 'ascending' | 'descending'
    }
}

