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
        
        this.ctx.services.logger.logInfo('🔔 Initializing NotificationsService', 'NOTIFICATIONS');
        
        this.pmsTasksNotificationsService = new BunGuestAPITasksNotifications(ctx.configuration, ctx.services.pmsAPIClient, ctx.services.logger);
        this.pmsTasksNotificationsService.emitter.on('notification', this.handleTasksNotification.bind(this));
        
        this.ctx.services.logger.logInfo('🔔 Connected to PMS Tasks Notifications service', 'NOTIFICATIONS');
        
        // Limpeza periódica de la caché de notificaciones
        setInterval(() => this.cleanupNotificationsCache(), this.CACHE_DURATION_MS);
        
        this.ctx.services.logger.logInfo('🔔 NotificationsService initialized successfully', 'NOTIFICATIONS');
    }

    /**
     * Limpar entradas antiguas de la caché de notificaciones.
     */
    private cleanupNotificationsCache(): void {
        const now = Date.now();
        const initialSize = this.processedNotifications.size;
        
        for (const [key, notification] of this.processedNotifications.entries()) {
            if (now - notification.timestamp > this.CACHE_DURATION_MS) {
                this.processedNotifications.delete(key);
            }
        }
        
        const finalSize = this.processedNotifications.size;
        const cleaned = initialSize - finalSize;
        
        if (cleaned > 0) {
            this.ctx.services.logger.logDebug(`🔔 Cleaned ${cleaned} expired notifications from cache (${finalSize} remaining)`, 'NOTIFICATIONS');
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
        
        this.ctx.services.logger.logDebug(`🔔 Marked task ${taskIdStr} as processed (cache size: ${this.processedNotifications.size})`, 'NOTIFICATIONS');
    }

    /**
     * Suscribe un WebSocket a los canales de notificaciones del usuario.
     * @param { ServerWebSocket } ws - WebSocket del servidor al que se suscribirá.
     * @param { IUser} user - Usuario al que se suscribirá a los canales de notificaciones.
     */
    public async subscribe(ws: ServerWebSocket, user: IUser) {
        this.ctx.services.logger.logInfo(`🔔 Subscribing WebSocket for user: ${user.username || user.id}`, 'NOTIFICATIONS');
        
        const channels = await NotificationsService.getNotificationsChannels(this.ctx, user);
        this.ctx.services.logger.logInfo(`🔔 Found ${channels.length} notification channels for user ${user.username}`, 'NOTIFICATIONS');
        
        for (const channel of channels) {
            ws.subscribe(channel.id);
            this.ctx.services.logger.logDebug(`🔔 WebSocket subscribed to channel: ${channel.id}`, 'NOTIFICATIONS');
        }
        
        this.ctx.services.logger.logInfo(`🔔 WebSocket subscription completed for user ${user.username}`, 'NOTIFICATIONS');
    }

    /**
     * Cancela la subscripción de un WebSocket a los canales de notificaciones del usuario.
     * @param { ServerWebSocket } ws - WebSocket del servidor del que se dará de baja.
     * @param { IUser } user - Usuario a dar de baja en los canales de notificaciones.
     */
    public async unsubscribe(ws: ServerWebSocket, user: IUser) {
        this.ctx.services.logger.logInfo(`🔔 Unsubscribing WebSocket for user: ${user.username || user.id}`, 'NOTIFICATIONS');
        
        const channels = await NotificationsService.getNotificationsChannels(this.ctx, user);
        this.ctx.services.logger.logInfo(`🔔 Found ${channels.length} channels to unsubscribe for user ${user.username}`, 'NOTIFICATIONS');
        
        for (const channel of channels) {
            ws.unsubscribe(channel.id);
            this.ctx.services.logger.logDebug(`🔔 WebSocket unsubscribed from channel: ${channel.id}`, 'NOTIFICATIONS');
        }
        
        this.ctx.services.logger.logInfo(`🔔 WebSocket unsubscription completed for user ${user.username}`, 'NOTIFICATIONS');
    }

    /** Tratar notificación de tarea */
    private async handleTasksNotification(notification: any) {
        this.ctx.services.logger.logDebug(`🔔 Received task notification from SignalR`, 'NOTIFICATIONS');
        
        try {
            const taskNotification: IGTaskNotification = notification as IGTaskNotification;
            
            this.ctx.services.logger.logDebug(`🔔 Task notification data: ${JSON.stringify(taskNotification)}`, 'NOTIFICATIONS');
            
            if (!(taskNotification && taskNotification?.Task_id)) {
                this.ctx.services.logger.logWarning(`🔔 Invalid task notification - missing Task_id`, 'NOTIFICATIONS');
                return;
            }

            this.ctx.services.logger.logInfo(`🔔 Processing task notification for Task_id: ${taskNotification.Task_id}`, 'NOTIFICATIONS');

            // Ignorar notificaciones duplicadas (presuntas)
            if (this.isRecentlyProcessed(taskNotification.Task_id)) {
                this.ctx.services.logger.logDebug(`🔔 Ignoring duplicate task notification for Task_id: ${taskNotification.Task_id}`, 'NOTIFICATIONS');
                return;
            }

            const task = await this.ctx.services.pmsDatabase.tasks.findById(SYSTEM_USER, taskNotification.Task_id);
            if (task) {
                this.ctx.services.logger.logInfo(`🔔 Found task in database: ${task.id} - ${task.description}`, 'NOTIFICATIONS');
                
                const channel = this.selectNotificationChannel('tasks', task);
                if (channel) {
                    this.ctx.services.logger.logInfo(`🔔 Selected notification channel: ${channel.id}`, 'NOTIFICATIONS');
                    
                    const notificationData: INotification = {
                        id: Bun.randomUUIDv7(),
                        timestamp: new Date(),
                        channel: channel,
                        topic: 'tasks' as NotificationTopic,
                        read: false,
                        data: task
                    };

                    this.ctx.services.logger.logDebug(`🔔 Publishing notification to channel ${channel.id}: ${JSON.stringify(notificationData)}`, 'NOTIFICATIONS');

                    // Emitir la notificación a través del servidor WebSocket pub/sub
                    this.server.publish(channel.id, JSON.stringify(notificationData));

                    this.ctx.services.logger.logInfo(`🔔 Successfully published task notification to channel ${channel.id}`, 'NOTIFICATIONS');

                    // Marcar la notificación como procesada para evitar duplicados
                    this.markAsProcessed(taskNotification.Task_id);
                } else {
                    this.ctx.services.logger.logWarning(`🔔 No notification channel found for task ${task.id}`, 'NOTIFICATIONS');
                }
            } else {
                this.ctx.services.logger.logWarning(`🔔 Task not found in database for Task_id: ${taskNotification.Task_id}`, 'NOTIFICATIONS');
            }

        } catch (error) {
            this.ctx.services.logger.logError(`🔔 Error handling task notification: ${error}`, 'NOTIFICATIONS');
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
        this.ctx.services.logger.logDebug(`🔔 Selecting notification channel for topic: ${topic}`, 'NOTIFICATIONS');
        
        if (!data) {
            this.ctx.services.logger.logWarning(`🔔 No data provided for channel selection`, 'NOTIFICATIONS');
            return undefined;
        }

        if (topic === 'tasks') {
            const task = data as ITask;
            this.ctx.services.logger.logDebug(`🔔 Building channel for task - Center: ${task.center?.name} (${task.center?.id}), Department: ${task.department?.name} (${task.department?.id})`, 'NOTIFICATIONS');
            
            const channel = NotificationsService.buildChannelId(topic, task.center, task.department);
            if (channel) {
                this.ctx.services.logger.logDebug(`🔔 Built channel ID: ${channel}`, 'NOTIFICATIONS');
                return {
                    id: channel,
                    center: task.center,
                    department: task.department
                };
            } else {
                this.ctx.services.logger.logWarning(`🔔 Failed to build channel ID for task`, 'NOTIFICATIONS');
            }
        }

        this.ctx.services.logger.logWarning(`🔔 No channel found for topic: ${topic}`, 'NOTIFICATIONS');
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
        if (!center || !department) {
            console.warn(`🔔 [NOTIFICATIONS] Cannot build channel ID - missing center or department`);
            return undefined;
        }

        let channelId: string | undefined = undefined;

        if (topic === 'tasks') {
            channelId = `tasks-${center.id}-${department.id}`;
        } else if (topic === 'booking') {
            channelId = `booking-${center.id}-${department.id}`;
        } else if (topic === 'rooms') {
            channelId = `rooms-${center.id}-${department.id}`;
        }

        if (channelId) {
            console.debug(`🔔 [NOTIFICATIONS] Built channel ID: ${channelId} for topic ${topic}`);
        } else {
            console.warn(`🔔 [NOTIFICATIONS] Invalid topic for channel ID: ${topic}`);
        }

        return channelId;
    }

    /**
     * Obtiene los canales de notificaciones disponibles para un usuario.
     * @param { IUser } user - Usuario para el cual se obtienen los canales de notificaciones.
     * @returns { Promise<INotificationsChannel[]> } - Lista de canales de notificaciones disponibles para el usuario.
     */
    public static async getNotificationsChannels(ctx: IApiContext, user: IUser): Promise<INotificationsChannel[]> {
        ctx.services.logger.logDebug(`🔔 Getting notification channels for user: ${user.username}`, 'NOTIFICATIONS');
        
        const channels: INotificationsChannel[] = [];
        
        const centers: ICenter[] = await ctx.services.pmsDatabase.centers.findAll(user);
        ctx.services.logger.logDebug(`🔔 Found ${centers.length} centers for user ${user.username}`, 'NOTIFICATIONS');
        
        let departments: IDepartment[] = [];
        if (user.roles.includes('wappops-departments-all')) {
            departments = await ctx.services.pmsDatabase.departments.findAll(user);
            ctx.services.logger.logDebug(`🔔 User has access to ALL departments (${departments.length} total)`, 'NOTIFICATIONS');
        } else {
            if (user.department) {
                departments.push(user.department);
                ctx.services.logger.logDebug(`🔔 User limited to single department: ${user.department.name}`, 'NOTIFICATIONS');
            } else {
                ctx.services.logger.logWarning(`🔔 User has no department access`, 'NOTIFICATIONS');
            }
        }

        if (user.roles.includes('wappops-tasks') || user.roles.includes('wappops-tasks-rw')) {
            ctx.services.logger.logDebug(`🔔 User has tasks role - creating task channels`, 'NOTIFICATIONS');
            for (const center of centers) {
                for (const department of departments) {
                    const channel = NotificationsService.getChannel('tasks', center, department);
                    if (channel) {
                        channels.push(channel);
                        ctx.services.logger.logDebug(`🔔 Added task channel: ${channel.id}`, 'NOTIFICATIONS');
                    }
                }
            }
        }

        if (user.roles.includes('wappops-rooms-status') || user.roles.includes('wappops-rooms-status-rw')) {
            ctx.services.logger.logDebug(`🔔 User has rooms-status role - creating room/booking channels`, 'NOTIFICATIONS');
            for (const center of centers) {
                for (const department of departments) {
                    const roomsChannel = NotificationsService.getChannel('rooms', center, department);
                    if (roomsChannel) {
                        channels.push(roomsChannel);
                        ctx.services.logger.logDebug(`🔔 Added rooms channel: ${roomsChannel.id}`, 'NOTIFICATIONS');
                    }

                    const bookingChannel = NotificationsService.getChannel('booking', center, department);
                    if (bookingChannel) {
                        channels.push(bookingChannel);
                        ctx.services.logger.logDebug(`🔔 Added booking channel: ${bookingChannel.id}`, 'NOTIFICATIONS');
                    }   
                }
            }
        }

        ctx.services.logger.logInfo(`🔔 Created ${channels.length} notification channels for user ${user.username}`, 'NOTIFICATIONS');
        
        // Log all channels for debugging
        if (channels.length > 0) {
            const channelIds = channels.map(c => c.id).join(', ');
            ctx.services.logger.logDebug(`🔔 Channel IDs: ${channelIds}`, 'NOTIFICATIONS');
        }

        return channels;
    }
}