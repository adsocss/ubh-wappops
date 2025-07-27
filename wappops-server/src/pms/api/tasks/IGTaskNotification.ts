/**
 * Notificaciones de tareas de Guest PMS
 */


/**
 * Interfaz para la respuesta de notificaciones de tareas
 * Siempre es una Array de elementos IGTaskNotification
 */
export interface IGTaskNotificationResponse {
    IGTaskNotifications: IGTaskNotification[];
}

/**
 * Elemento individual de la respuesta de notificaciones de tareas
 */
export interface IGTaskNotification {
  Task_id: number;
  TaskNumber: number;
  AppCustomer_id: number;
  Center_id: number;
  StartDate: string;
  EndDate: string | null;
  TaskStatus: number;
  Priority: number;
  Room_id: number | null;
  LockedRoom: boolean;
}
