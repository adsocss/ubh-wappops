import { IReservation, IRoom } from "@model/data-model";
import { isToday } from "../../application/utils/datetimeutils";
import { Wappops } from "../../application/wappops";

/**
 * Interfase que extiende IRoom para incluir información adicional
 * relacionada con el  número de tareas pendientes, llegadas y
 * salidas asociadas a la habitación.
 */
export interface IRoomInfo extends IRoom {
    pendingTasksCount?: number; // Número de tareas pendientes asociadas a la habitación
    arrivalsCount?: number; // Número de llegadas asociadas a la habitación
    departuresCount?: number; // Número de salidas asociadas a la habitación
    isOccupied?: boolean; // Indica si la habitación está ocupada
}

/**
 * Devuelve el número de tareas pendientes asociadas a una habitación.
 * @param { Wappops } ctx - Contexto de la aplicación
 * @param { IRoom } room - Habitación para la que se desea obtener el número de tareas pendientes
 * @returns { number }
 */
export async function getPendingTasksCount(ctx: Wappops, room: IRoom): Promise<number> {
    return ctx.db.tasks
        .filter(task => task.targetType.code === 'room')
        .filter(task => task.taskTarget?.id === room?.id)
        .filter(task => task.status.code !== 'closed')
        .count();
}

/**
 * Devuelve el número de reservas asociadas a una habitación que son
 * entradas del día actual.
 * @param { Wappops } ctx - Contexto de la aplicación
 * @param { IRoom } room - Habitación para la que se desea obtener el número de reservas
 * @returns { Promise<number> } - Número de reservas de entrada
 */
export async function getArrivalsCount(ctx: Wappops, room: IRoom): Promise<number> {
    return await ctx.db.booking
        .filter((r: IReservation) => r.roomId === room.id)
        .filter((r) => isToday(r.arrival))
        .count();
}

/**
 * Devuelve el número de reservas asociadas a una habitación que son
 * salidas del día actual.
 * @param { Wappops } ctx - Contexto de la aplicación
 * @param { IRoom } room - Habitación para la que se desea obtener el número de reservas
 * @returns { Promise<number> } - Número de reservas de salida
 */
export async function getDeparturesCount(ctx: Wappops, room: IRoom): Promise<number> {  
    return await ctx.db.booking
        .filter((r: IReservation) => r.roomId === room.id)
        .filter((r) => isToday(r.departure))
        .count();
}

/**
 * Determina si una habitación está ocupada.
 * @param { Wappops } ctx - Contexto de la aplicación
 * @param { IRoom } room  - Habitación para la que se desea verificar si está ocupada
 * @returns {  Promise<boolean> } - Verdadero si la habitación está ocupada, falso en caso contrario
 */
export async function isOccupied(ctx: Wappops, room: IRoom): Promise<boolean> {
    return await (ctx.db.booking
        .filter((r: IReservation) => r.roomId === room.id)
        .filter((r) => r.status === 'check-in')
        .count()) > 0;
}