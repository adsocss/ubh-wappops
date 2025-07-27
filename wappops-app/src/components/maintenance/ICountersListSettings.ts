import { ICenter } from "@model/data-model";

/**
 * Parámetros de configuración de la lista de tareas.
 */
export interface ICountersListSettings {
    filter: {
        centers: ICenter[] | undefined;

    }
}
