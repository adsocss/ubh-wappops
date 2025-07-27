import { ITask, IUser } from "@model/data-model";

export function hasAllCentersPermission(user: IUser | undefined) {
    if (!user) return false;
    if (user.authorizations instanceof Array) return false;
    
    return user.authorizations.centerIds === '*';
}

/**
 * Determina si un usuario determinado tiene permisos para leer tareas.
 * @param { IUser } user - Usuario
 * @returns { boolean } - Devuelve true si el usuario los tiene.
 */
export function canReadTasks(user: IUser): boolean {
    return user.roles.includes('wappops-tasks') || user.roles.includes('wappops-tasks-rw');
}

/**
 * Determina si un usuario determinado tiene permisos para escribir tareas.
 * @param { IUser } user - Usuario
 * @returns { boolean } - Devuelve true si el usuario los tiene.
 */
export function canWriteTasks(user: IUser): boolean {
    return user.roles.includes('wappops-tasks-rw');
}

/**
 * Determina si un usuario determinado tiene permisos para modificar una 
 * tarea concreta.
 * @param  { IUser } user - Usuario de la operación.
 * @param { ITask } task - Tarea a modificar.
 * @returns true si el usuario puede finalizar la tarea, false en caso contrario.
 */
export function canModifyTask(user: IUser, task: ITask): boolean {
    if (!canWriteTasks(user)) {
        return false;
    }

    if (user.username === task.createdByUsername) {
        return true;
    }

    return user.department?.id === task.department?.id;
}

/**
 * Determina si un usuario determinado tiene permisos para leer estados de habitaciones.
 * @param { IUser } user - Usuario
 * @returns { boolean } - Devuelve true si el usuario los tiene.
 */
export function canReadRooms(user: IUser): boolean {
    return user.roles.includes('wappops-rooms-status') || user.roles.includes('wappops-rooms-status-rw');
}   

/**
 * Determina si un usuario determinado tiene permisos para cambiar estados de habitaciones.
 * @param { IUser } user - Usuario
 * @returns { boolean } - Devuelve true si el usuario los tiene.
 */
export function canWriteRooms(user: IUser): boolean {
    return user.roles.includes('wappops-rooms-status-rw');
}   

/**
 * Determina si un usuario determinado tiene permisos para leer las lecturas de contadores.
 * @param user - Usuario
 * @returns { boolean } - Devuelve true si el usuario los tiene.
 */
export function canReadCounters(user: IUser): boolean {
    return user.roles.includes('wappops-counters') || user.roles.includes('wappops-counters-rw');
}

/**
 * Determina si un usuario determinado tiene permisos para escribir las lecturas de contadores.
 * @param user - Usuario
 * @returns { boolean } - Devuelve true si el usuario los tiene.
 */
export function canWriteCounters(user: IUser): boolean {
    return user.roles.includes('wappops-counters-rw');
}

