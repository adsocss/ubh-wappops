import type { Server, ServerWebSocket } from "bun";
import type { IApiContext } from "../application/api/IApiContext";
import type { IGTaskNotification } from "../pms/api/tasks/IGTaskNotification";
import { BunGuestAPITasksNotifications } from "./BunGuestAPITasksNotifications";
import { SYSTEM_USER } from "../application/auth/AuthConstants";
import type { ICenter, IDepartment, INotificationsChannel, ITask, IUser } from "../model/data-model";
import type { INotification, NotificationTopic } from "../application/notifications/INotification";

export const NOTIFICATIONS_SERVICE_NAME = 'notifications';

/**
 * Registro de notificación para la caché.
 */
interface ProcessedNotification {
    taskId: string;
    timestamp: number;
}

/**
 * Servicio de notificaciones.
 */
export class NotificationsService {
    private server: Server;
    private pmsTasksNotificationsService: BunGuestAPITasksNotifications;
    private ctx: IApiContext;
    
    // Cache de notificaciones recientes para evitar duplicados
    private processedNotifications: Map<string, ProcessedNotification> = new Map();
    private readonly CACHE_DURATION_MS = 5000; // 5 segundos

    constructor(ctx: IApiContext, server: Server) {
        this.server = server;
        this.ctx = ctx;
        this.pmsTasksNotificationsService = new BunGuestAPITasksNotifications(ctx.configuration, ctx.services.pmsAPIClient, ctx.services.logger);
        this.pmsTasksNotificationsService.emitter.on('notification', this.handleTasksNotification.bind(this));
        
        // Limpeza periódica de la caché de notificaciones
        setInterval(() => this.cleanupNotificationsCache(), this.CACHE_DURATION_MS);
    }

    /**
     * Limpar entradas antiguas de la caché de notificaciones.
     */
    private cleanupNotificationsCache(): void {
        const now = Date.now();
        for (const [key, notification] of this.processedNotifications.entries()) {
            if (now - notification.timestamp > this.CACHE_DURATION_MS) {
                this.processedNotifications.delete(key);
            }
        }
    }

    /**
     * Verificar si una notificación ya ha sido procesada recientemente.
     */
    private isRecentlyProcessed(taskId: number | string): boolean {
        const taskIdStr = taskId.toString();
        const cached = this.processedNotifications.get(taskIdStr);
        if (!cached) {
            return false;
        }
        
        const now = Date.now();
        if (now - cached.timestamp > this.CACHE_DURATION_MS) {
            this.processedNotifications.delete(taskIdStr);
            return false;
        }
        
        return true;
    }

    /**
     * Marcar una notificación como procesada para evitar duplicados.
     */
    private markAsProcessed(taskId: number | string): void {
        const taskIdStr = taskId.toString();
        this.processedNotifications.set(taskIdStr, {
            taskId: taskIdStr,
            timestamp: Date.now()
        });
    }

    /**
     * Suscribe un WebSocket a los canales de notificaciones del usuario.
     * @param { ServerWebSocket } ws - WebSocket del servidor al que se suscribirá.
     * @param { IUser} user - Usuario al que se suscribirá a los canales de notificaciones.
     */
    public async subscribe(ws: ServerWebSocket, user: IUser) {
        const channels = await NotificationsService.getNotificationsChannels(this.ctx, user);
        for (const channel of channels) {
            ws.subscribe(channel.id);
        }
    }

    /**
     * Cancela la subscripción de un WebSocket a los canales de notificaciones del usuario.
     * @param { ServerWebSocket } ws - WebSocket del servidor del que se dará de baja.
     * @param { IUser } user - Usuario a dar de baja en los canales de notificaciones.
     */
    public async unsubscribe(ws: ServerWebSocket, user: IUser) {
        const channels = await NotificationsService.getNotificationsChannels(this.ctx, user);
        for (const channel of channels) {
            ws.unsubscribe(channel.id);
        }
    }

    /** Tratar notificación de tarea */
    private async handleTasksNotification(notification: any) {
        try {
            const taskNotification: IGTaskNotification = notification as IGTaskNotification;
            if (!(taskNotification && taskNotification?.Task_id)) {
                // Ignorar si la notificación no es válida o no contiene un ID de tarea
                return;
            }

            // Ignorar notificaciones duplicadas (presuntas)
            if (this.isRecentlyProcessed(taskNotification.Task_id)) {
                return;
            }

            const task = await this.ctx.services.pmsDatabase.tasks.findById(SYSTEM_USER, taskNotification.Task_id);
            if (task) {
                const channel = this.selectNotificationChannel('tasks', task);
                if (channel) {
                    const notificationData: INotification = {
                        id: Bun.randomUUIDv7(),
                        timestamp: new Date(),
                        channel: channel,
                        topic: 'tasks' as NotificationTopic,
                        read: false,
                        data: task
                    };

                    // Emitir la notificación a través del servidor WebSocket pub/sub
                    this.server.publish(channel.id, JSON.stringify(notificationData));

                    // Marcar la notificación como procesada para evitar duplicados
                    this.markAsProcessed(taskNotification.Task_id);
                }
            }

        } catch (error) {
            this.ctx.services.logger.logError(error as Error, 'NOTIFICATIONS');
            return;
        }
    }

    /**
     * Selecciona el canal de notificaciones basado en el tema y los datos proporcionados.
     * @param { NotificationTopic } topic - Tema de la notificación.
     * @param { any } data - Datos asociados a la notificación.
     * @returns { INotificationsChannel | undefined } - Canal de notificaciones o undefined si no se encuentra.
     */
    private selectNotificationChannel(topic: NotificationTopic, data: any): INotificationsChannel | undefined {
        if (!data) {
            return undefined;
        }

        if (topic === 'tasks') {
            const task = data as ITask;
            const channel = NotificationsService.buildChannelId(topic, task.center, task.department);
            if (channel) {
                return {
                    id: channel,
                    center: task.center,
                    department: task.department
                };
            }
        }

        return undefined;
    }

    /**
     * Obtiene el canal de notificaciones para un tema específico, centro y departamento.
     * @param { NotificationTopic } topic - Tema del canal de notificaciones.
     * @param { ICenter } center - Centro asociado al canal.
     * @param { IDepartment } department - Departamento asociado al canal.
     * @returns { INotificationsChannel | undefined } - Canal de notificaciones o undefined si no se puede construir.
     */
    public static getChannel(topic: NotificationTopic, center: ICenter, department: IDepartment): INotificationsChannel | undefined {
        const channelId = NotificationsService.buildChannelId(topic, center, department);
        if (channelId) {
            return {
                id: channelId,
                center: center,
                department: department
            };
        }

        return undefined;
    }

    /**
     * Construye el ID del canal de notificaciones para un tema específico.
     * @param { NotificationTopic } topic - Tema del canal de notificaciones.
     * @param { ICenter } center - Centro asociado al canal.
     * @param { IDepartment } department - Departamento asociado al canal.
     * @returns {  string | undefined } - ID del canal de notificaciones o undefined si el tema no es válido.
     */
    public static buildChannelId(topic: NotificationTopic, center: ICenter, department: IDepartment): string | undefined {
        if (topic === 'tasks') {
            return `tasks-${center.id}-${department.id}`;
        } else if (topic === 'booking') {
            return `booking-${center.id}-${department.id}`;
        } else if (topic === 'rooms') {
            return `rooms-${center.id}-${department.id}`;
        }

        return undefined;
    }

    /**
     * Obtiene los canales de notificaciones disponibles para un usuario.
     * @param { IUser } user - Usuario para el cual se obtienen los canales de notificaciones.
     * @returns { Promise<INotificationsChannel[]> } - Lista de canales de notificaciones disponibles para el usuario.
     */
    public static async getNotificationsChannels(ctx: IApiContext, user: IUser): Promise<INotificationsChannel[]> {
        const channels: INotificationsChannel[] = [];
        
        const centers: ICenter[] = await ctx.services.pmsDatabase.centers.findAll(user);
        
        let departments: IDepartment[] = [];
        if (user.roles.includes('wappops-departments-all')) {
            departments = await ctx.services.pmsDatabase.departments.findAll(user);
        } else {
            if (user.department) {
                departments.push(user.department);
            }
        }

        if (user.roles.includes('wappops-tasks') || user.roles.includes('wappops-tasks-rw')) {
            for (const center of centers) {
                for (const department of departments) {
                    const channel = NotificationsService.getChannel('tasks', center, department);
                    if (channel) {
                        channels.push(channel);
                    }
                }
            }
        }

        if (user.roles.includes('wappops-rooms-status') || user.roles.includes('wappops-rooms-status-rw')) {
            for (const center of centers) {
                for (const department of departments) {
                    const roomsChannel = NotificationsService.getChannel('rooms', center, department);
                    if (roomsChannel) {
                        channels.push(roomsChannel);
                    }

                    const bookingChannel = NotificationsService.getChannel('booking', center, department);
                    if (bookingChannel) {
                        channels.push(bookingChannel);
                    }   
                }
            }
        }

        return channels;
    }
}