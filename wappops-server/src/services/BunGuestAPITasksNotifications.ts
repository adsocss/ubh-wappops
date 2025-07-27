import { EventEmitter } from "events";
import type { IApplicationConfiguration } from "../application/config/IAplicationConfiguration";
import type { IWSConfiguration } from "../application/config/IWSConfiguration";
import type { IGTaskNotification } from "../pms/api/tasks/IGTaskNotification";
import { BunHubConnectionBuilder, type BunHubConnection } from "./BunSignalRClient";
import type { GuestAPIClient } from "./GuestAPIClient";
import type Logger from "./logger";

export class BunGuestAPITasksNotifications {
    private wsConfig: IWSConfiguration | undefined;
    private apiClient: GuestAPIClient;
    private logger: Logger | undefined;

    private connection: BunHubConnection | undefined;
    
    // Cache para notificaciones recientes para evitar notificaciones duplicadas.
    private recentNotifications: Set<number> = new Set();
    private readonly RECENT_CACHE_DURATION_MS = 5000; // 5 seconds
    
    // Control de reconexión
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private isManuallyDisconnected = false;
    
    // Long-term reconnection strategies
    private lastSuccessfulConnection = Date.now();
    private connectionFailureWindow = 5 * 60 * 1000; // 5 minutes
    private maxFailuresInWindow = 10;
    private connectionFailures: number[] = [];
    private backoffMultiplier = 1.5;
    private maxBackoffDelay = 5 * 60 * 1000; // 5 minutes
    
    // Network monitoring
    private networkMonitorInterval: Timer | undefined;
    private networkCheckIntervalMs = 60000; // 60 seconds - reduced frequency for better performance
    private lastNetworkCheck = Date.now();
    
    readonly emitter: EventEmitter = new EventEmitter();

    /**
     * Constructor
     * @param { IApplicationConfiguration } config - Configuración de la aplicación
     * @param { GuestAPIClient } apiClient - Cliente de la API de Guest PMS
     * @param { Logger } logger - Instancia del servicio de logging (opcional)
     */
    constructor(config: IApplicationConfiguration, apiClient: GuestAPIClient, logger?: Logger) {
        this.wsConfig = config.pms.ws.find(ws => ws.topic === 'tasks');
        this.apiClient = apiClient;
        this.logger = logger;
        
        if (!this.wsConfig) {
            this.logger?.logError('No configuration found for tasks WebSocket connection', 'SIGNALR');
            return;
        }

        this.connection = this.createConnection();
        
        if (this.connection) {
            this.startConnection();
            
            // Iniciar monitoreo de red después de establecer la conexión
            this.startNetworkMonitoring();
        }
        
        // Limpiar la caché de notificaciones recientes periódicamente
        setInterval(() => {
            this.recentNotifications.clear();
        }, this.RECENT_CACHE_DURATION_MS);
    }

    /**
     * Inicia la conexión SignalR con manejo de errores
     */
    private async startConnection(): Promise<void> {
        if (!this.connection) {
            this.logger?.logError('No connection available to start', 'SIGNALR');
            return;
        }

        try {
            await this.connection.start();
            this.logger?.logInfo('SignalR connection started successfully', 'SIGNALR');
        } catch (error) {
            this.logger?.logError(`Error establishing SignalR connection: ${error}`, 'SIGNALR');
            // No hacer reconexión manual aquí - dejar que el sistema de monitoreo de red se encargue
            // o que el mecanismo automático de reconexión del SignalR cliente maneje los reintentos
        }
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
            this.logger?.logError('No WebSocket configuration found for tasks notifications', 'SIGNALR');
            return undefined;
        }

        const connection = new BunHubConnectionBuilder()
            .withUrl(this.wsConfig.host, {
                accessTokenFactory: async () => {
                    try {
                        this.logger?.logDebug('Obtaining access token for SignalR connection...', 'SIGNALR');
                        
                        if (!this.wsConfig?.username || !this.wsConfig?.password) {
                            this.logger?.logError('No credentials configured for SignalR connection', 'SIGNALR');
                            return '';
                        }

                        // Usar el nuevo método getValidToken que incluye reintentos
                        const token = await this.apiClient.getValidToken(
                            this.wsConfig.username, 
                            this.wsConfig.password
                        );

                        if (token) {
                            this.logger?.logDebug('Access token obtained successfully for SignalR', 'SIGNALR');
                            return token;
                        } else {
                            this.logger?.logError('Failed to obtain access token for SignalR connection', 'SIGNALR');
                            return '';
                        }
                    } catch (error) {
                        this.logger?.logError(`Error in accessTokenFactory: ${error}`, 'SIGNALR');
                        return '';
                    }
                }
            })
            .configureLogging('Information')
            .withAutomaticReconnect([5000, 10000, 15000, 20000, 30000, 45000, 60000]
                .map(time => time + Math.floor(Math.random() * 2000)))
            .withPingInterval(15000)  // Ping every 15 seconds (reasonable frequency)
            .withPingTimeout(60000)   // Consider connection dead if no pong received in 60 seconds
            .withDebug(false)         // Disable debug logging now that reconnection logic is stable
            .build();

        // Recepción de notificaciones
        connection.on('ReceiveNotification', (user: string, message: string) => {
            try {
                const notifications: IGTaskNotification[] = JSON.parse(message);
                // Las notificaciones de tareas son siempre un Array
                if (Array.isArray(notifications) && notifications.length > 0) {
                    const taskInfo = notifications[0];
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
            this.logger?.logInfo('Intentando conectar SignalR...', 'SIGNALR');
        });

        connection.on('connected', () => {
            this.logger?.logInfo('Conexión SignalR establecida.', 'SIGNALR');
            this.reconnectAttempts = 0; // Reset contador de reconexiones
            this.lastSuccessfulConnection = Date.now();
            this.connectionFailures = []; // Clear failure history on successful connection
        });

        connection.on('reconnecting', () => {
            this.reconnectAttempts++;
            this.logger?.logWarning(`Intentando reconexión SignalR... (Intento ${this.reconnectAttempts})`, 'SIGNALR');
        });

        connection.on('reconnectionExhausted', () => {
            this.logger?.logError('Máximo número de intentos de reconexión automática alcanzado. Iniciando estrategia de reconexión a largo plazo.', 'SIGNALR');
            this.emitter.emit('maxReconnectAttemptsReached');
            this.startLongTermReconnectionStrategy();
        });

        connection.on('disconnected', () => {
            if (!this.isManuallyDisconnected) {
                this.logger?.logWarning('Conexión SignalR desconectada inesperadamente.', 'SIGNALR');
                this.recordConnectionFailure();
            } else {
                this.logger?.logInfo('Conexión SignalR desconectada.', 'SIGNALR');
            }
        });

        connection.on('error', (error: Error) => {
            this.logger?.logError('Error en conexión SignalR:', 'SIGNALR');
            this.logger?.logError(error, 'SIGNALR');
            this.recordConnectionFailure();
            // Emitir evento para que otros componentes puedan reaccionar
            this.emitter.emit('connectionError', error);
        });

        return connection;
    }

    /**
     * Desconectar
     */
    async stop(): Promise<void> {
        this.isManuallyDisconnected = true;
        
        // Detener monitoreo de red
        this.stopNetworkMonitoring();
        
        if (this.connection) {
            try {
                await this.connection.stop();
                this.logger?.logInfo('SignalR connection stopped successfully', 'SIGNALR');
            } catch (error) {
                this.logger?.logError('Error stopping SignalR connection:', 'SIGNALR');
                this.logger?.logError(error as Error, 'SIGNALR');
            }
        }
    }

    /**
     * Reiniciar la conexión manualmente
     */
    async restart(): Promise<void> {
        this.logger?.logInfo('Restarting SignalR connection...', 'SIGNALR');
        await this.stop();
        
        // Esperar un poco antes de reconectar
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        this.isManuallyDisconnected = false;
        this.reconnectAttempts = 0;
        
        if (this.connection) {
            // Reset reconnection attempts in the SignalR client
            this.connection.resetReconnectionAttempts();
            await this.startConnection();
            // Reiniciar monitoreo de red después de la reconexión
            this.startNetworkMonitoring();
        } else {
            // Recrear la conexión si es necesario
            this.connection = this.createConnection();
            if (this.connection) {
                await this.startConnection();
            }
        }
    }

    /**
     * Obtener el estado de la conexión
     */
    getConnectionState(): string {
        return this.connection?.getState() || 'Disconnected';
    }

    /**
     * Verificar si la conexión está activa
     */
    isConnected(): boolean {
        return this.getConnectionState() === 'Connected';
    }

    /**
     * Registrar un fallo de conexión para análisis de tendencias
     */
    private recordConnectionFailure(): void {
        const now = Date.now();
        this.connectionFailures.push(now);
        
        // Limpiar fallos antiguos fuera de la ventana de tiempo
        this.connectionFailures = this.connectionFailures.filter(
            failureTime => now - failureTime < this.connectionFailureWindow
        );
        
        this.logger?.logWarning(`Connection failure recorded. ${this.connectionFailures.length} failures in last ${this.connectionFailureWindow/60000} minutes`, 'SIGNALR');
    }

    /**
     * Verificar si estamos en un patrón de fallos persistentes
     */
    private isPersistentFailurePattern(): boolean {
        return this.connectionFailures.length >= this.maxFailuresInWindow;
    }

    /**
     * Estrategia de reconexión a largo plazo con backoff exponencial
     */
    private async startLongTermReconnectionStrategy(): Promise<void> {
        if (this.isManuallyDisconnected) {
            return;
        }

        this.logger?.logInfo('Iniciando estrategia de reconexión a largo plazo...', 'SIGNALR');
        
        let backoffDelay = 30000; // Start with 30 seconds
        let attempt = 1;
        
        const longTermReconnect = async (): Promise<void> => {
            if (this.isManuallyDisconnected || this.isConnected()) {
                return;
            }

            this.logger?.logInfo(`Long-term reconnection attempt ${attempt}, waiting ${backoffDelay/1000}s...`, 'SIGNALR');
            
            try {
                // Check API health first
                const apiStatus = await this.checkAPIHealth();
                if (apiStatus !== 'ok') {
                    this.logger?.logWarning('API health check failed, extending backoff...', 'SIGNALR');
                    backoffDelay = Math.min(backoffDelay * this.backoffMultiplier, this.maxBackoffDelay);
                } else {
                    this.logger?.logInfo('API health check passed, attempting reconnection...', 'SIGNALR');
                    await this.restart();
                    
                    // If we get here and still not connected, continue with backoff
                    if (!this.isConnected()) {
                        backoffDelay = Math.min(backoffDelay * this.backoffMultiplier, this.maxBackoffDelay);
                    } else {
                        this.logger?.logInfo('Long-term reconnection successful!', 'SIGNALR');
                        return; // Success, exit strategy
                    }
                }
            } catch (error) {
                this.logger?.logError('Long-term reconnection attempt failed:', 'SIGNALR');
                this.logger?.logError(error as Error, 'SIGNALR');
                backoffDelay = Math.min(backoffDelay * this.backoffMultiplier, this.maxBackoffDelay);
            }
            
            attempt++;
            
            // Schedule next attempt
            setTimeout(longTermReconnect, backoffDelay);
        };
        
        // Start the long-term strategy after initial delay
        setTimeout(longTermReconnect, backoffDelay);
    }

    /**
     * Verificar salud de la API antes de intentar reconexión
     * Optimized version that skips token validation during routine checks
     */
    private async checkAPIHealth(skipTokenValidation: boolean = false): Promise<'ok' | 'failing'> {
        try {
            if (!this.wsConfig?.username || !this.wsConfig?.password) {
                return 'failing';
            }

            // Use the API client's built-in health check (lightweight probe)
            const healthStatus = await this.apiClient.status();
            
            // Skip expensive token validation for routine network monitoring
            if (skipTokenValidation) {
                return healthStatus;
            }
            
            // Only check token when absolutely necessary (during actual reconnection attempts)
            const tokenCheck = await this.apiClient.getValidToken(
                this.wsConfig.username,
                this.wsConfig.password
            );
            
            return (healthStatus === 'ok' && tokenCheck !== null) ? 'ok' : 'failing';
        } catch (error) {
            this.logger?.logError('API health check error:', 'SIGNALR');
            this.logger?.logError(error as Error, 'SIGNALR');
            return 'failing';
        }
    }

    /**
     * Obtener estadísticas de la conexión
     */
    getConnectionStats(): { 
        state: string; 
        reconnectAttempts: number; 
        maxReconnectAttempts: number;
        isManuallyDisconnected: boolean;
        lastSuccessfulConnection: number;
        connectionFailuresInWindow: number;
        isPersistentFailurePattern: boolean;
        circuitBreakerState?: any;
    } {
        return {
            state: this.getConnectionState(),
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            isManuallyDisconnected: this.isManuallyDisconnected,
            lastSuccessfulConnection: this.lastSuccessfulConnection,
            connectionFailuresInWindow: this.connectionFailures.length,
            isPersistentFailurePattern: this.isPersistentFailurePattern(),
            circuitBreakerState: this.apiClient.getCircuitBreakerState()
        };
    }

    /**
     * Iniciar monitoreo de conectividad de red
     */
    private startNetworkMonitoring(): void {
        if (this.networkMonitorInterval) {
            clearInterval(this.networkMonitorInterval);
        }

        this.networkMonitorInterval = setInterval(async () => {
            await this.performNetworkCheck();
        }, this.networkCheckIntervalMs);

        this.logger?.logInfo(`Network monitoring started, checking every ${this.networkCheckIntervalMs/1000}s (lightweight probe)`, 'SIGNALR');
    }

    /**
     * Detener monitoreo de conectividad de red
     */
    private stopNetworkMonitoring(): void {
        if (this.networkMonitorInterval) {
            clearInterval(this.networkMonitorInterval);
            this.networkMonitorInterval = undefined;
            this.logger?.logInfo('Network monitoring stopped', 'SIGNALR');
        }
    }

    /**
     * Realizar verificación de conectividad de red
     */
    private async performNetworkCheck(): Promise<void> {
        if (this.isManuallyDisconnected) {
            return;
        }

        try {
            const now = Date.now();
            this.lastNetworkCheck = now;

            // Verificar estado de la API (lightweight check for routine monitoring)
            const apiStatus = await this.checkAPIHealth(true);
            
            if (apiStatus === 'failing') {
                this.logger?.logWarning('Network check failed - API is not responding', 'SIGNALR');
                
                // Si la conexión SignalR parece estar activa pero la API no responde,
                // es probable que tengamos un problema de red
                if (this.isConnected()) {
                    this.logger?.logWarning('SignalR appears connected but API is unreachable - possible network issue', 'SIGNALR');
                    this.recordConnectionFailure();
                    
                    // Trigger a reconnection attempt
                    this.logger?.logInfo('Triggering reconnection due to network connectivity issue', 'SIGNALR');
                    await this.restart();
                }
            } else {
                this.logger?.logDebug('Network check passed', 'SIGNALR');
                
                // Si el API funciona pero SignalR no está conectado, intentar reconectar
                if (!this.isConnected() && !this.isManuallyDisconnected) {
                    this.logger?.logInfo('Network recovered and API is responding - attempting SignalR reconnection', 'SIGNALR');
                    await this.restart();
                }
            }
        } catch (error) {
            this.logger?.logError('Network check error:', 'SIGNALR');
            this.logger?.logError(error as Error, 'SIGNALR');
        }
    }
}
