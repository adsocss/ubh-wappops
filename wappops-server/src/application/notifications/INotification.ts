import type { ICenter, IDepartment, IReservation, IRoom, ITask, IUser } from '../../model/data-model';

export type NotificationTopic = 'tasks' | 'booking' | 'rooms';

/**
 * Interfase de las notificaciones.
 */
export interface INotification {
    id: string
    timestamp: Date
    channel: INotificationsChannel
    topic: NotificationTopic
    description?: string
    read: boolean
    data: ITask | IReservation | IRoom
}

/**
 * Interfase de los canales de notificaciones.
 */
export interface INotificationsChannel {
    id: string
    center: ICenter | '*'
    department: IDepartment | '*'
}

/**
 * Interfase del mensaje de suscripción / baja a los canales de notificaciones
 * de un usuario determinado.
 */
export interface ISubscriptionMessage {
    type: 'subscribe' | 'unsubscribe'
    user: IUser
}
