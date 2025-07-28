// NotificationsService - Web Push only (no WebSocket support)
import type { IApiContext } from "../application/api/IApiContext";
import type { IGTaskNotification } from "../pms/api/tasks/IGTaskNotification";
import { BunGuestAPITasksNotifications } from "./BunGuestAPITasksNotifications";
import { SYSTEM_USER } from "../application/auth/AuthConstants";
import type { ICenter, IDepartment, INotificationsChannel, ITask, IUser } from "../model/data-model";
import type { INotification, NotificationTopic } from "../application/notifications/INotification";
import * as webpush from 'web-push';

export const NOTIFICATIONS_SERVICE_NAME = 'notifications';

/**
 * Web Push subscription data
 */
export interface IPushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

/**
 * User push subscription record
 */
export interface IUserPushSubscription {
    userId: string;
    subscription: IPushSubscription;
    userAgent?: string;
    timestamp: Date;
    channels: string[]; // notification channels this subscription is interested in
}

/**
 * Registro de notificación para la caché.
 */
interface ProcessedNotification {
    taskId: string;
    timestamp: number;
}

/**
 * Servicio de notificaciones - Web Push only
 */
export class NotificationsService {
    private pmsTasksNotificationsService: BunGuestAPITasksNotifications;
    private ctx: IApiContext;
    
    // Cache de notificaciones recientes para evitar duplicados
    private processedNotifications: Map<string, ProcessedNotification> = new Map();
    private readonly CACHE_DURATION_MS = 5000; // 5 segundos
    
    // Web Push subscriptions storage
    private pushSubscriptions: Map<string, IUserPushSubscription[]> = new Map(); // userId -> subscriptions[]

    constructor(ctx: IApiContext) {
        this.ctx = ctx;
        
        this.ctx.services.logger.logInfo('🔔 Initializing NotificationsService (Web Push only)', 'NOTIFICATIONS');
        
        this.pmsTasksNotificationsService = new BunGuestAPITasksNotifications(ctx.configuration, ctx.services.pmsAPIClient, ctx.services.logger);
        this.pmsTasksNotificationsService.emitter.on('notification', this.handleTasksNotification.bind(this));
        
        this.ctx.services.logger.logInfo('🔔 Connected to PMS Tasks Notifications service', 'NOTIFICATIONS');
        
        // Configurar VAPID para web-push si está disponible
        if (this.ctx.configuration.security?.vapid?.publicKey && this.ctx.configuration.security?.vapid?.privateKey) {
            webpush.setVapidDetails(
                this.ctx.configuration.security.vapid.subject || 'mailto:noreply@wappops.com',
                this.ctx.configuration.security.vapid.publicKey,
                this.ctx.configuration.security.vapid.privateKey
            );
            this.ctx.services.logger.logInfo('🔔 VAPID configured for web-push library', 'NOTIFICATIONS');
        } else {
            this.ctx.services.logger.logWarning('🔔 VAPID keys not configured - Web Push will not work', 'NOTIFICATIONS');
        }
        
        // Limpeza periódica de la caché de notificaciones
        setInterval(() => this.cleanupNotificationsCache(), this.CACHE_DURATION_MS);
        
        // Log VAPID configuration status
        const vapidConfigured = this.ctx.configuration.security?.vapid?.publicKey && this.ctx.configuration.security?.vapid?.privateKey;
        this.ctx.services.logger.logInfo(`🔔 VAPID keys ${vapidConfigured ? 'configured' : 'NOT configured'}`, 'NOTIFICATIONS');
        
        this.ctx.services.logger.logInfo('🔔 NotificationsService initialized successfully', 'NOTIFICATIONS');
    }

    /**
     * Get VAPID public key for client subscription
     */
    public getVAPIDPublicKey(): string | undefined {
        return this.ctx.configuration.security?.vapid?.publicKey;
    }

    /**
     * Register a Web Push subscription for a user
     */
    public async registerPushSubscription(user: IUser, subscription: IPushSubscription, userAgent?: string): Promise<boolean> {
        try {
            this.ctx.services.logger.logInfo(`🔔 Registering push subscription for user: ${user.username}`, 'NOTIFICATIONS');
            
            const userSubscriptions = this.pushSubscriptions.get(user.id) || [];
            
            // Check if subscription already exists
            const existingIndex = userSubscriptions.findIndex(sub => sub.subscription.endpoint === subscription.endpoint);
            
            // Get user's notification channels
            const channels = await NotificationsService.getNotificationsChannels(this.ctx, user);
            const channelIds = channels.map(c => c.id);
            
            this.ctx.services.logger.logInfo(`🔔 User ${user.username} has access to channels: [${channelIds.join(', ')}]`, 'NOTIFICATIONS');
            
            const userPushSubscription: IUserPushSubscription = {
                userId: user.id,
                subscription,
                userAgent,
                timestamp: new Date(),
                channels: channelIds
            };
            
            if (existingIndex >= 0) {
                // Update existing subscription
                userSubscriptions[existingIndex] = userPushSubscription;
                this.ctx.services.logger.logInfo(`🔔 Updated existing push subscription for user ${user.username}`, 'NOTIFICATIONS');
            } else {
                // Add new subscription
                userSubscriptions.push(userPushSubscription);
                this.ctx.services.logger.logInfo(`🔔 Added new push subscription for user ${user.username}`, 'NOTIFICATIONS');
            }
            
            this.pushSubscriptions.set(user.id, userSubscriptions);
            
            this.ctx.services.logger.logInfo(`🔔 User ${user.username} has ${userSubscriptions.length} push subscription(s) for ${channelIds.length} channels`, 'NOTIFICATIONS');
            
            return true;
        } catch (error) {
            this.ctx.services.logger.logError(`🔔 Error registering push subscription for user ${user.username}: ${error}`, 'NOTIFICATIONS');
            return false;
        }
    }

    /**
     * Unregister a Web Push subscription
     */
    public async unregisterPushSubscription(user: IUser, endpoint: string): Promise<boolean> {
        try {
            const userSubscriptions = this.pushSubscriptions.get(user.id) || [];
            const filteredSubscriptions = userSubscriptions.filter(sub => sub.subscription.endpoint !== endpoint);
            
            if (filteredSubscriptions.length < userSubscriptions.length) {
                this.pushSubscriptions.set(user.id, filteredSubscriptions);
                this.ctx.services.logger.logInfo(`🔔 Unregistered push subscription for user ${user.username}`, 'NOTIFICATIONS');
                return true;
            } else {
                this.ctx.services.logger.logWarning(`🔔 Push subscription not found for user ${user.username}`, 'NOTIFICATIONS');
                return false;
            }
        } catch (error) {
            this.ctx.services.logger.logError(`🔔 Error unregistering push subscription for user ${user.username}: ${error}`, 'NOTIFICATIONS');
            return false;
        }
    }

    /**
     * Send Web Push notification to subscribers of a channel
     */
    private async sendWebPushNotification(channelId: string, notification: INotification): Promise<void> {
        try {
            this.ctx.services.logger.logDebug(`🔔 Looking for Web Push subscribers for channel: ${channelId}`, 'NOTIFICATIONS');
            this.ctx.services.logger.logDebug(`🔔 Current push subscriptions: ${this.pushSubscriptions.size} users`, 'NOTIFICATIONS');
            
            // Extract channel info from channelId (format: "topic-centerId-departmentId")
            const channelParts = channelId.split('-');
            const channelTopic = channelParts[0];
            const channelCenterId = channelParts[1];
            const channelDepartmentId = channelParts[2];
            
            this.ctx.services.logger.logDebug(`🔔 Channel breakdown - Topic: ${channelTopic}, Center: ${channelCenterId}, Department: ${channelDepartmentId}`, 'NOTIFICATIONS');
            
            // Find all users subscribed to this channel OR who have access to the notification's center/department
            const subscribedUsers: IUserPushSubscription[] = [];
            
            for (const [userId, userSubscriptions] of this.pushSubscriptions.entries()) {
                this.ctx.services.logger.logDebug(`🔔 User ${userId} has ${userSubscriptions.length} subscription(s)`, 'NOTIFICATIONS');
                for (const subscription of userSubscriptions) {
                    this.ctx.services.logger.logDebug(`🔔 Subscription channels: [${subscription.channels.join(', ')}]`, 'NOTIFICATIONS');
                    
                    // Check for exact channel match first
                    if (subscription.channels.includes(channelId)) {
                        subscribedUsers.push(subscription);
                        this.ctx.services.logger.logDebug(`🔔 ✅ Found exact channel match for ${channelId}`, 'NOTIFICATIONS');
                        continue;
                    }
                    
                    // If no exact match, check if user has access to any channel with the same topic and center/department
                    const hasAccessToNotificationContext = subscription.channels.some(userChannel => {
                        const userChannelParts = userChannel.split('-');
                        if (userChannelParts.length >= 3) {
                            const userTopic = userChannelParts[0];
                            const userCenterId = userChannelParts[1];
                            const userDepartmentId = userChannelParts[2];
                            
                            // Match topic and check if user has access to the center/department combination
                            const matches = userTopic === channelTopic && 
                                          userCenterId === channelCenterId && 
                                          userDepartmentId === channelDepartmentId;
                            
                            if (matches) {
                                this.ctx.services.logger.logDebug(`🔔 Context match: user channel ${userChannel} matches notification context`, 'NOTIFICATIONS');
                            }
                            
                            return matches;
                        }
                        return false;
                    });
                    
                    if (hasAccessToNotificationContext) {
                        subscribedUsers.push(subscription);
                        this.ctx.services.logger.logDebug(`🔔 ✅ Found context-based match for ${channelId}: user ${subscription.userId}`, 'NOTIFICATIONS');
                    }
                }
            }
            
            if (subscribedUsers.length === 0) {
                this.ctx.services.logger.logWarning(`🔔 No Web Push subscribers found for channel ${channelId}`, 'NOTIFICATIONS');
                this.ctx.services.logger.logDebug(`🔔 Available channels in subscriptions: ${Array.from(this.pushSubscriptions.values()).flat().map(s => s.channels).flat().join(', ')}`, 'NOTIFICATIONS');
                
                // Enhanced debugging - log all current subscriptions with detailed breakdown
                this.ctx.services.logger.logDebug(`🔔 Detailed subscription analysis:`, 'NOTIFICATIONS');
                for (const [userId, userSubscriptions] of this.pushSubscriptions.entries()) {
                    this.ctx.services.logger.logDebug(`🔔   User ${userId}: ${userSubscriptions.length} subscription(s)`, 'NOTIFICATIONS');
                    for (const sub of userSubscriptions) {
                        this.ctx.services.logger.logDebug(`🔔     Channels: [${sub.channels.join(', ')}]`, 'NOTIFICATIONS');
                        // Analyze each channel for compatibility
                        for (const userChannel of sub.channels) {
                            const userParts = userChannel.split('-');
                            if (userParts.length >= 3) {
                                const analysis = `Topic:${userParts[0]} Center:${userParts[1]} Dept:${userParts[2]}`;
                                this.ctx.services.logger.logDebug(`🔔       ${userChannel} -> ${analysis}`, 'NOTIFICATIONS');
                            }
                        }
                    }
                }
                return;
            }
            
            this.ctx.services.logger.logInfo(`🔔 Sending Web Push notification to ${subscribedUsers.length} subscriber(s) on channel ${channelId}`, 'NOTIFICATIONS');
            
            // Prepare push notification payload - LIGHTWEIGHT VERSION to avoid 4096 byte limit
            const pushPayload = {
                title: this.getNotificationTitle(notification),
                body: this.getNotificationBody(notification),
                icon: '/pwa-512x512.png',
                badge: '/favicon.ico',
                tag: `task-${notification.data.id}`,
                data: {
                    notificationId: notification.id,
                    taskId: notification.data.id,
                    channel: channelId,
                    timestamp: notification.timestamp.toISOString(),
                    // Include only essential data to avoid FCM 4096 byte limit
                    notification: {
                        id: notification.id,
                        topic: notification.topic,
                        description: notification.description,
                        timestamp: notification.timestamp.toISOString(),
                        channel: {
                            id: notification.channel.id,
                            center: typeof notification.channel.center === 'object' ? {
                                id: notification.channel.center.id,
                                name: notification.channel.center.name
                            } : null,
                            department: typeof notification.channel.department === 'object' ? {
                                id: notification.channel.department.id,
                                name: notification.channel.department.name
                            } : null
                        },
                        // Essential task data only (for tasks topic)
                        data: notification.topic === 'tasks' ? {
                            id: notification.data.id,
                            number: (notification.data as any).number,
                            description: (notification.data as any).description,
                            status: (notification.data as any).status?.name,
                            priority: (notification.data as any).priority?.name,
                            department: (notification.data as any).department ? {
                                id: (notification.data as any).department.id,
                                name: (notification.data as any).department.name
                            } : null,
                            center: (notification.data as any).center ? {
                                id: (notification.data as any).center.id,
                                name: (notification.data as any).center.name
                            } : null,
                            targetType: (notification.data as any).targetType?.name,
                            taskTarget: (notification.data as any).taskTarget ? {
                                number: (notification.data as any).taskTarget.number,
                                type: (notification.data as any).taskTarget.type
                            } : null
                        } : {
                            id: notification.data.id,
                            type: notification.topic
                        }
                    }
                },
                actions: [
                    {
                        action: 'view',
                        title: 'Ver tarea'
                    },
                    {
                        action: 'dismiss',
                        title: 'Cerrar'
                    }
                ]
            };
            
            // Log payload size for debugging
            const payloadSize = JSON.stringify(pushPayload).length;
            this.ctx.services.logger.logDebug(`🔔 Push payload size: ${payloadSize} bytes (limit: 4096)`, 'NOTIFICATIONS');
            
            // Send to all subscribers (you'll need to implement the actual web-push sending)
            const pushResults = await Promise.allSettled(
                subscribedUsers.map(userSub => this.sendPushToSubscription(userSub.subscription, pushPayload))
            );
            
            // Log results
            const successful = pushResults.filter(result => result.status === 'fulfilled').length;
            const failed = pushResults.filter(result => result.status === 'rejected').length;
            
            this.ctx.services.logger.logInfo(`🔔 Web Push results: ${successful} successful, ${failed} failed`, 'NOTIFICATIONS');
            
            if (failed > 0) {
                const errors = pushResults
                    .filter(result => result.status === 'rejected')
                    .map(result => (result as PromiseRejectedResult).reason);
                this.ctx.services.logger.logWarning(`🔔 Web Push errors: ${JSON.stringify(errors)}`, 'NOTIFICATIONS');
            }
            
        } catch (error) {
            this.ctx.services.logger.logError(`🔔 Error sending Web Push notification: ${error}`, 'NOTIFICATIONS');
        }
    }

    /**
     * Send push notification to a specific subscription using web-push library
     */
    private async sendPushToSubscription(subscription: IPushSubscription, payload: any): Promise<void> {
        try {
            // Verificar que VAPID esté configurado
            if (!this.ctx.configuration.security?.vapid?.publicKey || !this.ctx.configuration.security?.vapid?.privateKey) {
                throw new Error('VAPID keys not configured');
            }

            this.ctx.services.logger.logDebug(`🔔 Sending Web Push to ${subscription.endpoint.substring(0, 50)}...`, 'NOTIFICATIONS');
            
            // Convertir nuestra IPushSubscription al formato que espera web-push
            const webPushSubscription = {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth
                }
            };

            // Enviar la notificación
            const result = await webpush.sendNotification(
                webPushSubscription, 
                JSON.stringify(payload),
                {
                    TTL: 3600, // 1 hora
                    urgency: 'normal'
                }
            );

            this.ctx.services.logger.logDebug(`🔔 Web Push sent successfully (status: ${result.statusCode})`, 'NOTIFICATIONS');
            
        } catch (error) {
            // Manejar errores específicos de web-push
            if (error instanceof Error) {
                if (error.message.includes('410') || error.message.includes('Gone')) {
                    this.ctx.services.logger.logWarning(`🔔 Push subscription expired/invalid: ${subscription.endpoint.substring(0, 50)}...`, 'NOTIFICATIONS');
                    // TODO: Aquí podrías remover la suscripción expirada automáticamente
                } else if (error.message.includes('413') || error.message.includes('Payload too large')) {
                    this.ctx.services.logger.logError(`🔔 Push payload too large`, 'NOTIFICATIONS');
                } else {
                    this.ctx.services.logger.logError(`🔔 Web Push error: ${error.message}`, 'NOTIFICATIONS');
                }
            } else {
                this.ctx.services.logger.logError(`🔔 Unknown Web Push error: ${error}`, 'NOTIFICATIONS');
            }
            throw error; // Re-throw para que el caller pueda manejarlo
        }
    }

    /**
     * Get notification title for push notification
     */
    private getNotificationTitle(notification: INotification): string {
        switch (notification.topic) {
            case 'tasks':
                const task = notification.data as ITask;
                const departmentName = task?.department?.name || 'Sin departamento';
                const title = `Nueva tarea: ${departmentName}`;
                this.ctx.services.logger.logDebug(`🔔 Generated notification title: "${title}" from task department: ${departmentName}`, 'NOTIFICATIONS');
                return title;
            case 'booking':
                return 'Nueva reserva';
            case 'rooms':
                return 'Estado de habitación actualizado';
            default:
                return 'Nueva notificación';
        }
    }

    /**
     * Get notification body for push notification
     */
    private getNotificationBody(notification: INotification): string {
        switch (notification.topic) {
            case 'tasks':
                const task = notification.data as ITask;
                const description = task?.description;
                let body: string;
                
                if (description) {
                    body = description.length > 100 ? `${description.substring(0, 100)}...` : description;
                } else {
                    body = 'Sin descripción';
                }
                
                this.ctx.services.logger.logDebug(`🔔 Generated notification body: "${body}" from task description: ${description || 'undefined'}`, 'NOTIFICATIONS');
                return body;
            default:
                const fallbackBody = notification.description || 'Nueva notificación disponible';
                this.ctx.services.logger.logDebug(`🔔 Using fallback notification body: "${fallbackBody}"`, 'NOTIFICATIONS');
                return fallbackBody;
        }
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

    /** Tratar notificación de tarea - Web Push only */
    private async handleTasksNotification(notification: any) {
        this.ctx.services.logger.logDebug(`🔔 Received task notification from SignalR`, 'NOTIFICATIONS');
        
        try {
            const taskNotification: IGTaskNotification = notification as IGTaskNotification;
            
            this.ctx.services.logger.logInfo(`🔔 REAL NOTIFICATION PROCESSING START - Task notification data: ${JSON.stringify(taskNotification)}`, 'NOTIFICATIONS');
            
            if (!(taskNotification && taskNotification?.Task_id)) {
                this.ctx.services.logger.logWarning(`🔔 Invalid task notification - missing Task_id`, 'NOTIFICATIONS');
                return;
            }

            this.ctx.services.logger.logInfo(`🔔 REAL NOTIFICATION - Processing task notification for Task_id: ${taskNotification.Task_id}`, 'NOTIFICATIONS');

            // Ignorar notificaciones duplicadas (presuntas)
            if (this.isRecentlyProcessed(taskNotification.Task_id)) {
                this.ctx.services.logger.logDebug(`🔔 REAL NOTIFICATION - Ignoring duplicate task notification for Task_id: ${taskNotification.Task_id}`, 'NOTIFICATIONS');
                return;
            }

            const task = await this.ctx.services.pmsDatabase.tasks.findById(SYSTEM_USER, taskNotification.Task_id);
            if (task) {
                this.ctx.services.logger.logInfo(`🔔 REAL NOTIFICATION - Found task in database: ${task.id} - ${task.description}`, 'NOTIFICATIONS');
                this.ctx.services.logger.logInfo(`🔔 REAL NOTIFICATION - Task details: Center=${task.center?.id} (${task.center?.name}), Department=${task.department?.id} (${task.department?.name})`, 'NOTIFICATIONS');
                
                const channel = this.selectNotificationChannel('tasks', task);
                if (channel) {
                    this.ctx.services.logger.logInfo(`🔔 REAL NOTIFICATION - Selected notification channel: ${channel.id}`, 'NOTIFICATIONS');
                    
                    const notificationData: INotification = {
                        id: Bun.randomUUIDv7(),
                        timestamp: new Date(),
                        channel: channel,
                        topic: 'tasks' as NotificationTopic,
                        read: false,
                        data: task,
                        description: `Tarea #${task.number} - ${task.department?.name || 'Sin departamento'}` // Set proper description
                    };

                    this.ctx.services.logger.logInfo(`🔔 REAL NOTIFICATION - Sending Web Push notification for channel ${channel.id}: ${JSON.stringify(notificationData)}`, 'NOTIFICATIONS');

                    // Send Web Push notification
                    await this.sendWebPushNotification(channel.id, notificationData);

                    // Marcar la notificación como procesada para evitar duplicados
                    this.markAsProcessed(taskNotification.Task_id);
                    
                    this.ctx.services.logger.logInfo(`🔔 REAL NOTIFICATION PROCESSING COMPLETE - Successfully processed task ${task.id}`, 'NOTIFICATIONS');
                } else {
                    this.ctx.services.logger.logWarning(`🔔 REAL NOTIFICATION - No notification channel found for task ${task.id} (Center: ${task.center?.id}, Department: ${task.department?.id})`, 'NOTIFICATIONS');
                }
            } else {
                this.ctx.services.logger.logWarning(`🔔 REAL NOTIFICATION - Task not found in database for Task_id: ${taskNotification.Task_id}`, 'NOTIFICATIONS');
            }

        } catch (error) {
            this.ctx.services.logger.logError(`🔔 REAL NOTIFICATION ERROR - Error handling task notification: ${error}`, 'NOTIFICATIONS');
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

    /**
     * Get count of push subscriptions (for debugging)
     */
    public getPushSubscriptionsCount(): number {
        return this.pushSubscriptions.size;
    }

    /**
     * Get debug information about push subscriptions
     */
    public getPushSubscriptionsDebugInfo(): any {
        const debugInfo: any = {};
        
        for (const [userId, subscriptions] of this.pushSubscriptions.entries()) {
            debugInfo[userId] = subscriptions.map(sub => ({
                endpoint: sub.subscription.endpoint.substring(0, 50) + '...',
                channels: sub.channels,
                timestamp: sub.timestamp,
                userAgent: sub.userAgent
            }));
        }
        
        return debugInfo;
    }

    /**
     * Send a test push notification for debugging purposes
     * PUBLIC method for testing
     */
    public async sendTestPushNotification(channelId: string, title: string, body: string): Promise<boolean> {
        try {
            this.ctx.services.logger.logInfo(`🔔 Sending test push notification to channel: ${channelId}`, 'NOTIFICATIONS');
            
            // Create a test notification data structure
            const testNotification: INotification = {
                id: `test-${Date.now()}`,
                timestamp: new Date(),
                channel: {
                    id: channelId,
                    center: { id: '1025', name: 'Test Center' } as any,
                    department: { id: '2', name: 'Test Department' } as any
                },
                topic: 'tasks' as NotificationTopic,
                read: false,
                data: {
                    id: 'test-123',
                    description: body,
                    department: { id: '2', name: 'Test Department' },
                    center: { id: '1025', name: 'Test Center' }
                } as any,
                description: body
            };
            
            // Send test notification with custom title and body - bypass normal title/body generation
            this.ctx.services.logger.logDebug(`🔔 Looking for Web Push subscribers for channel: ${channelId}`, 'NOTIFICATIONS');
            
            // Find subscribers
            const subscribedUsers: any[] = [];
            for (const [userId, userSubscriptions] of this.pushSubscriptions.entries()) {
                for (const subscription of userSubscriptions) {
                    if (subscription.channels.includes(channelId)) {
                        subscribedUsers.push(subscription);
                    }
                }
            }
            
            if (subscribedUsers.length === 0) {
                this.ctx.services.logger.logWarning(`🔔 No Web Push subscribers found for test notification on channel ${channelId}`, 'NOTIFICATIONS');
                return false;
            }
            
            this.ctx.services.logger.logInfo(`🔔 Sending test Web Push notification to ${subscribedUsers.length} subscriber(s) on channel ${channelId}`, 'NOTIFICATIONS');
            
            // Prepare test push notification payload with custom title and body - LIGHTWEIGHT VERSION
            const pushPayload = {
                title: title, // Use the provided title directly
                body: body,   // Use the provided body directly
                icon: '/pwa-512x512.png',
                badge: '/favicon.ico',
                tag: `test-${testNotification.id}`,
                data: {
                    notificationId: testNotification.id,
                    taskId: testNotification.data.id,
                    channel: channelId,
                    timestamp: testNotification.timestamp.toISOString(),
                    // Lightweight test notification data
                    notification: {
                        id: testNotification.id,
                        topic: testNotification.topic,
                        description: testNotification.description,
                        timestamp: testNotification.timestamp.toISOString(),
                        channel: {
                            id: channelId,
                            center: { id: '1025', name: 'Test Center' },
                            department: { id: '2', name: 'Test Department' }
                        },
                        data: {
                            id: testNotification.data.id,
                            description: body,
                            isTest: true
                        }
                    }
                },
                actions: [
                    {
                        action: 'view',
                        title: 'Ver tarea'
                    },
                    {
                        action: 'dismiss',
                        title: 'Cerrar'
                    }
                ]
            };
            
            // Send to all subscribers
            const pushResults = await Promise.allSettled(
                subscribedUsers.map(userSub => this.sendPushToSubscription(userSub.subscription, pushPayload))
            );
            
            // Log results
            const successful = pushResults.filter(result => result.status === 'fulfilled').length;
            const failed = pushResults.filter(result => result.status === 'rejected').length;
            
            this.ctx.services.logger.logInfo(`🔔 Test Web Push results: ${successful} successful, ${failed} failed`, 'NOTIFICATIONS');
            
            return successful > 0;
            
        } catch (error) {
            this.ctx.services.logger.logError(`🔔 Error sending test push notification: ${error}`, 'NOTIFICATIONS');
            return false;
        }
    }
}
