import type { IApplicationConfiguration } from "../application/config/IAplicationConfiguration";
import type { IWSConfiguration } from "../application/config/IWSConfiguration";
import type { IGTaskNotification, IGTaskNotificationResponse } from "../pms/api/tasks/IGTaskNotification";
import type { GuestAPIClient, Session } from "./GuestAPIClient";
import { BunHubConnectionBuilder, type BunHubConnection } from "./BunSignalRClient";
import { EventEmitter } from "events";

export class BunGuestAPITasksNotifications {
    private wsConfig: IWSConfiguration | undefined;
    private apiClient: GuestAPIClient;
    private userSession: Session | undefined;

    // private notifications: IGTaskNotification[] = [];
    private connection: BunHubConnection | undefined;
    
    // Cache para notificaciones recientes para evitar notificaciones duplicadas.
    private recentNotifications: Set<number> = new Set();
    private readonly RECENT_CACHE_DURATION_MS = 5000; // 5 seconds
    
    readonly emitter: EventEmitter = new EventEmitter();

    /**
     * Constructor
     * @param { IApplicationConfiguration } config - Configuración de la aplicación
     * @param { GuestAPIClient } apiClient - Cliente de la API de Guest PMS
     */
    constructor(config: IApplicationConfiguration, apiClient: GuestAPIClient) {
        this.wsConfig = config.pms.ws.find(ws => ws.topic === 'tasks');
        this.apiClient = apiClient;
        this.connection = this.createConnection();
        this.connection?.start().catch(error => {
            console.error('Error estableciendo conexión SignalR:', error);
        });
        
        // Limpiar la caché de notificaciones recientes periódicamente
        setInterval(() => {
            this.recentNotifications.clear();
        }, this.RECENT_CACHE_DURATION_MS);
    }

    /**
     * Verificar si una notificación ha sido recibida recientemente para evitar duplicados inmediatos
     */
    private isRecentlyReceived(taskId: number): boolean {
        const key = taskId;
        return this.recentNotifications.has(key);
    }

    /**
     * Marcar una notificación como recientemente recibida
     */
    private markAsRecentlyReceived(taskId: number): void {
        const key = taskId;
        this.recentNotifications.add(key);
        
        // Eliminar de la caché después de un tiempo
        setTimeout(() => {
            this.recentNotifications.delete(key);
        }, this.RECENT_CACHE_DURATION_MS);
    }

    /* Crear la conexión SignalR con la API de GUEST PMS */
    private createConnection(): BunHubConnection | undefined {
        if (!this.wsConfig) {
            return undefined;
        }

        const connection = new BunHubConnectionBuilder()
            .withUrl(this.wsConfig.host, {
                accessTokenFactory: async () => {
                    await this.login();
                    return this.userSession?.tokens.accessToken || '';
                }
            })
            .configureLogging('Information')
            .withAutomaticReconnect([5000, 10000, 15000, 20000, 30000, 45000, 60000]
                .map(time => time + Math.floor(Math.random() * 2000)))
            .withDebug(false)
            .build();

        // Recepción de notificaciones
        connection.on('ReceiveNotification', (user: string, message: string) => {
            try {
                const notification: IGTaskNotificationResponse = JSON.parse(message);
                // Las notificaciones de tareas son siempre un Array
                if (notification instanceof Array && notification.length > 0) {
                    const taskInfo = notification[0];
                    if (taskInfo && taskInfo.Task_id) {

                        // Check for immediate duplicates
                        if (!this.isRecentlyReceived(taskInfo.Task_id)) {
                            this.emitter.emit('notification', taskInfo);
                            this.markAsRecentlyReceived(taskInfo.Task_id);
                        } else {
                            // Si la notificación ya fue recibida recientemente, ignorar
                        }
                    }
                }
            } catch (_error) {
                // Si no se puede interpretar el mensaje, ignorar.
            }
        });

        // Eventos de conexión
        connection.on('connecting', () => {
            console.log('Intentando conectar SignalR...');
        });

        connection.on('connected', () => {
            console.log('Conexión SignalR establecida.');
        });

        connection.on('reconnecting', () => {
            console.log('Intentando reconexión SignalR...');
        });

        connection.on('disconnected', () => {
            console.log('Conexión SignalR desconectada.');
        });

        connection.on('error', (error: Error) => {
            console.error('Error en conexión SignalR:', error);
        });

        return connection;
    }

    /* Login del usuario del servicio de SignalR */
    private async login() {

        console.log('Iniciando sesión para el servicio de notificaciones de tareas ', this.wsConfig?.username);

        if (!(this.wsConfig?.username && this.wsConfig?.password)) {
            return;
        }

        try {
            const success = await this.apiClient.login(this.wsConfig.username, this.wsConfig.password);
            if (success) {
                this.userSession = this.apiClient.getSession(this.wsConfig.username);
            }
        } catch (error) {
            console.error('Error al iniciar sesión en Guest PMS:', error);
            return;
        }
    }

    /**
     * Desconectar
     */
    async stop(): Promise<void> {
        if (this.connection) {
            await this.connection.stop();
        }
    }

    /**
     * Obtener el estado de la conexión
     */
    getConnectionState(): string {
        return this.connection?.getState() || 'Disconnected';
    }
}
