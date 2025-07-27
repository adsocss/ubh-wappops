import type { IUser } from "../application/auth/IUser";
import type { IApplicationConfiguration } from "../application/config/IAplicationConfiguration";
import type { IGTokens } from "../pms/api/auth/IGTokens";
import type { ICounterRecordResponse, IGCounterRecord } from "../pms/api/counters/IGCounterRecord";
import type { IGTask } from "../pms/api/tasks/IGTask";
import type { IRoom } from "../pms/database/centers/IRoom";
import type { ICounterRecord } from "../pms/database/maintenance/ICounterRecord";
import type Logger from "./logger";

/**
 * Definición de la sesión de usuario en la API de Guest PMS.
 */
export type Session = {
    username: string
    password: string
    tokens: IGTokens
}

/**
 * Estados del circuit breaker
 */
enum CircuitBreakerState {
    CLOSED = 'CLOSED',     // Normal operation
    OPEN = 'OPEN',         // Failing, reject requests
    HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Configuración del circuit breaker
 */
interface CircuitBreakerConfig {
    failureThreshold: number;
    recoveryTimeout: number;
    monitorWindow: number;
}

export class GuestAPIClient {
    private url: string;
    private sessions: Map<string, Session> = new Map();
    private logger: Logger | undefined;
    private readonly maxRetries: number = 3;
    private readonly retryDelay: number = 2000; // 2 seconds
    
    // Circuit Breaker implementation
    private circuitBreakerState: CircuitBreakerState = CircuitBreakerState.CLOSED;
    private failureCount: number = 0;
    private lastFailureTime: number = 0;
    private circuitBreakerConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        recoveryTimeout: 60000, // 1 minute
        monitorWindow: 300000    // 5 minutes
    };

    // Health monitoring
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private isHealthMonitoringActive = false;

    /**
     * Constructor
     * @param { IApplicationConfiguration } configuration - Configuración general de la aplicación.
     * @param { Logger } logger - Instancia del servicio de logging (opcional).
     */
    constructor(configuration: IApplicationConfiguration, logger: Logger | undefined = undefined) {
        this.url = configuration.pms.api.dataHost.toString();
        this.logger = logger;
        this.startHealthMonitoring();
    }

    /**
     * Destructor - cleanup resources
     */
    public destroy(): void {
        this.stopHealthMonitoring();
    }

    /**
     * Verificar estado del circuit breaker
     */
    private canExecute(): boolean {
        const now = Date.now();
        
        switch (this.circuitBreakerState) {
            case CircuitBreakerState.CLOSED:
                return true;
                
            case CircuitBreakerState.OPEN:
                if (now - this.lastFailureTime >= this.circuitBreakerConfig.recoveryTimeout) {
                    this.circuitBreakerState = CircuitBreakerState.HALF_OPEN;
                    this.logger?.logInfo('Circuit breaker transitioning to HALF_OPEN state');
                    return true;
                }
                return false;
                
            case CircuitBreakerState.HALF_OPEN:
                return true;
                
            default:
                return false;
        }
    }

    /**
     * Registrar éxito en circuit breaker
     */
    private onSuccess(): void {
        this.failureCount = 0;
        if (this.circuitBreakerState === CircuitBreakerState.HALF_OPEN) {
            this.circuitBreakerState = CircuitBreakerState.CLOSED;
            this.logger?.logInfo('Circuit breaker returned to CLOSED state');
        }
    }

    /**
     * Registrar fallo en circuit breaker
     */
    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.circuitBreakerState === CircuitBreakerState.HALF_OPEN) {
            this.circuitBreakerState = CircuitBreakerState.OPEN;
            this.logger?.logError('Circuit breaker opened from HALF_OPEN state');
        } else if (this.failureCount >= this.circuitBreakerConfig.failureThreshold) {
            this.circuitBreakerState = CircuitBreakerState.OPEN;
            this.logger?.logError(`Circuit breaker opened after ${this.failureCount} failures`);
        }
    }

    /**
     * Obtener estado del circuit breaker
     */
    public getCircuitBreakerState(): { state: string; failureCount: number; lastFailureTime: number } {
        return {
            state: this.circuitBreakerState,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime
        };
    }

    /**
     * Iniciar monitoreo de salud de la API
     */
    private startHealthMonitoring(): void {
        if (this.isHealthMonitoringActive) {
            return;
        }

        this.isHealthMonitoringActive = true;
        this.healthCheckInterval = setInterval(async () => {
            try {
                const status = await this.status();
                if (status === 'ok' && this.circuitBreakerState === CircuitBreakerState.OPEN) {
                    // API recovered, try to close circuit breaker
                    this.circuitBreakerState = CircuitBreakerState.HALF_OPEN;
                    this.logger?.logInfo('API health check passed, circuit breaker transitioning to HALF_OPEN');
                }
            } catch (error) {
                this.logger?.logError(`Health check failed: ${error}`);
            }
        }, 30000); // Check every 30 seconds
    }

    /**
     * Detener monitoreo de salud de la API
     */
    private stopHealthMonitoring(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        this.isHealthMonitoringActive = false;
    }

    /**
     * Determina si un usuario tiene sesión activa.
     * @param { string } username - Nombre de usuario.
     * @returns { boolena } - true si tiene sesión activa.
     */
    public hasSession(username: string): boolean {
        return this.sessions.has(username);
    }

    /**
     * Obtiene la sesión de un usuario.
     * @param { string } username - Nombre de usuario.
     * @returns { Session | undefined } - La sesión del usuario o undefined si no existe.
     */
    public getSession(username: string): Session | undefined {
        return this.sessions.get(username); 
    }

    /**
     * Verifica si el token de un usuario está próximo a expirar (dentro de 5 minutos)
     * @param { string } username - Nombre de usuario.
     * @returns { boolean } - true si el token expira pronto o ya expiró.
     */
    public isTokenNearExpiry(username: string): boolean {
        const session = this.sessions.get(username);
        if (!session?.tokens) {
            return true; // No hay token, considerarlo como expirado
        }
        
        const now = new Date().getTime();
        const expirationTime = session.tokens.expirationDate.getTime();
        const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutos
        
        return (expirationTime - now) <= fiveMinutesInMs;
    }

    /**
     * Obtiene un token válido para el usuario, renovándolo si es necesario
     * @param { string } username - Nombre de usuario.
     * @param { string } password - Contraseña (opcional si ya hay sesión activa).
     * @returns { Promise<string | null> } - Token válido o null si falla.
     */
    public async getValidToken(username: string, password?: string): Promise<string | null> {
        try {
            // Primero intentar login/refresh con reintentos
            const loginSuccess = await this.loginWithRetry(username, password);
            if (!loginSuccess) {
                this.logger?.logError(`Failed to obtain valid token for user: ${username}`);
                return null;
            }

            const session = this.sessions.get(username);
            return session?.tokens.accessToken || null;
        } catch (error) {
            this.logger?.logError(`Error getting valid token for ${username}: ${error}`);
            return null;
        }
    }

    /**
     * Determinar el estado del servicio de la API de Guest PMS.
     * @returns { Promise<'ok' | 'failing'> } - 'ok' si la API está activa, 'failing' si no.
     */
    public async status(): Promise<'ok' | 'failing'> {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            controller.abort();
        }, 5000);

        // Intenta hacer una petición de login a la API para comprobar el estado
        // con credenciales ficticias.
        try {
            const endpoint = `${this.url}/users/login?Username=probe&Password=probe`;
            const _response = await fetch(endpoint, {
                method: 'POST',
                signal: controller.signal
            });

            // Cualquier respuesta de la API indica que la API está activa.
            clearTimeout(timer);
            return 'ok';
        } catch (error) {
            clearTimeout(timer);
            // Log the specific error for debugging
            this.logger?.logError(`API status check failed: ${error}`, 'API_CLIENT');
            return 'failing';
        }
    }

    /**
     * Login
     * @param { string } username - Nombre de usuario.
     * @param { string } password - Contraseña opcional, Si no se especifica, se intentará el login
     *                              con las credenciales almacenadas internamente.
     * @returns { Promise<boolean> } - 'true' solo si la autenticación ha sido correcta.
     */
    public async login(username: string, password: string | undefined = undefined): Promise<boolean> {
        let session = this.sessions.get(username);
        if (session && session.tokens) {
            if (session.tokens.expirationDate.getTime() <= new Date().getTime()) {
                const tokens = await this.refreshTokens(session);
                if (tokens) {
                    return true;
                }
            } else {
                return true;
            }
        }

        if (!password) {
            return false;
        }

        return await this.apiLogin(username, password);
    }

    /**
     * Login con reintentos automáticos y exponential backoff
     * @param { string } username - Nombre de usuario.
     * @param { string } password - Contraseña opcional.
     * @returns { Promise<boolean> } - 'true' solo si la autenticación ha sido correcta.
     */
    public async loginWithRetry(username: string, password?: string): Promise<boolean> {
        // Verificar circuit breaker
        if (!this.canExecute()) {
            this.logger?.logError(`Circuit breaker is OPEN, rejecting login attempt for ${username}`);
            return false;
        }

        let currentDelay = this.retryDelay;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                // Verificar si necesitamos renovar el token
                if (this.hasSession(username) && !this.isTokenNearExpiry(username)) {
                    this.onSuccess(); // Circuit breaker success
                    return true; // Token válido, no necesita renovación
                }

                const success = await this.login(username, password);
                if (success) {
                    this.onSuccess(); // Circuit breaker success
                    return true;
                }

                if (attempt < this.maxRetries) {
                    this.logger?.logInfo(`Login attempt ${attempt} failed for ${username}, retrying in ${currentDelay}ms...`);
                    await this.delay(currentDelay);
                    // Exponential backoff: double the delay for next attempt
                    currentDelay = Math.min(currentDelay * 2, 30000); // Max 30 seconds
                }
            } catch (error) {
                this.logger?.logError(`Login attempt ${attempt} failed for ${username}: ${error}`);
                this.onFailure(); // Circuit breaker failure
                
                if (attempt < this.maxRetries) {
                    await this.delay(currentDelay);
                    currentDelay = Math.min(currentDelay * 2, 30000); // Max 30 seconds
                }
            }
        }
        
        this.onFailure(); // Circuit breaker failure
        this.logger?.logError(`All login attempts failed for user: ${username}`);
        return false;
    }

    /**
     * Utilidad para esperar un tiempo determinado
     * @param { number } ms - Milisegundos a esperar.
     * @returns { Promise<void> }
     */
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /* Login en la API de Guest PMS */
    public async apiLogin(username: string, password: string): Promise<boolean> {
        if (!this.canExecute()) {
            this.logger?.logError(`Circuit breaker is OPEN, rejecting API login for ${username}`);
            return false;
        }

        try {
            const endpoint = `${this.url}/users/login?Username=${username}&Password=${password}`;
            const response = await fetch(endpoint, {
                method: 'POST'
            });

            if (response.ok) {
                const tokens = await response.json() as IGTokens;
                tokens.expirationDate = new Date(tokens.expirationDate);
                this.sessions.set(username, {
                    username: username,
                    password: password,
                    tokens: tokens
                });

                this.onSuccess(); // Circuit breaker success
                return true;
            }

            this.logAPIResponse(response);
            this.onFailure(); // Circuit breaker failure
            return false;
        } catch (error) {
            this.logger?.logError(`API login error for ${username}: ${error}`);
            this.onFailure(); // Circuit breaker failure
            return false;
        }
    }

    /* Refresco de tokens en la API de Guest PMS */
    private async refreshTokens(session: Session): Promise<boolean> {
        if (!this.canExecute()) {
            this.logger?.logError(`Circuit breaker is OPEN, rejecting token refresh for ${session.username}`);
            return false;
        }

        try {
            const endpoint = `${this.url}/users/refresh`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.tokens.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(session.tokens)
            });

            this.logAPIResponse(response);

            if (response.ok) {
                session.tokens = await response.json() as IGTokens;
                session.tokens.expirationDate = new Date(session.tokens.expirationDate);
                this.logger?.logInfo(`Token refreshed successfully for user: ${session.username}`);
                this.onSuccess(); // Circuit breaker success
                return true;
            } else {
                this.logger?.logError(`Token refresh failed for user: ${session.username}, status: ${response.status}`);
                this.onFailure(); // Circuit breaker failure
                return false;
            }
        } catch (error) {
            this.logger?.logError(`Error refreshing token for user: ${session.username}: ${error}`);
            this.onFailure(); // Circuit breaker failure
            return false;
        }
    }

    /**
     * Crear tarea
     * @param { IUser } user - Usuario.
     * @param { Request } request - Petición HTTP.
     * @returns { IGTask } - Tarea creada en el formato de la API.
     */
    public async createTask(user: IUser, request: Request): Promise<IGTask | undefined> {
        if (await this.login(user.username)) {
            const token = this.sessions.get(user.username)?.tokens.accessToken;
            // Ignorar la marca de obsoleto del método formData()
            // https://github.com/oven-sh/bun/issues/18701
            const formData = await request.formData();

            const response = await fetch(`${this.url}/operations/tasks`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                // @ts-ignore
                body: formData
            });

            this.logAPIResponse(response);

            if (!response.ok) {
                console.log(await response.json());
            }

            if (response.ok) {
                const result = await response.json() as unknown as IGTask[];
                if (result.length === 0) {
                    return undefined;
                }

                return result[0];
            }
        }

        return undefined;
    }

    /**
    * Actualizar tarea.
    * @param { IUser } user - Usuario.
    * @param { Request } request - Petición HTTP.
    * @returns { IGTask } - Tarea actualizada en el formato de la API.
    */
    public async updateTask(user: IUser, request: Request, id: number): Promise<IGTask | undefined> {
        if (await this.login(user.username)) {
            const token = this.sessions.get(user.username)?.tokens.accessToken;
            // Ignorar la marca de obsoleto del método formData()
            // https://github.com/oven-sh/bun/issues/18701
            const formData = await request.formData();

            const response = await fetch(`${this.url}/operations/tasks/${id}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                // @ts-ignore
                body: formData
            });

            this.logAPIResponse(response);

            if (response.ok) {
                const result = await response.json() as unknown as IGTask[];
                if (result.length === 0) {
                    return undefined;
                }

                return result[0];
            }
        }

        return undefined;
    }

    /**
     * Actualizar el estado de limpieza de una habitación.
     * @param { IUser } user - Usuario de la petición.
     * @param { Habitación } room 
     * @returns { Promise<boolean> } - 'true' si se ha actualizado.
     */
    public async updateRoomStatus(user: IUser, room: IRoom): Promise<boolean> {
        if (await this.login(user.username)) {
            const token = this.sessions.get(user.username)?.tokens.accessToken;
            const response = await fetch(`${this.url}/operations/rooms/clean_status/${room.id}?IsClean=${room.clean}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });

            this.logAPIResponse(response);

            return response.ok;
        }

        return false;
    }

    /**
     * Crear un registro de contador.
     * @param { IUser } user - Usuario de la petición.
     * @param { ICounterRecord } record - Registro a crear.
     * @returns { Promise<ICounterRecordResponse | undefined> } - Registro creado.
     */
    public async createCounterRecord(user: IUser, record: ICounterRecord): Promise<ICounterRecordResponse | undefined> {
        if (await this.login(user.username)) {
            const token = this.sessions.get(user.username)?.tokens.accessToken;
            const IGRecord: IGCounterRecord = {
                measure: record.value,
                date: record.date,
                filledOrReset: record.reset
            }

            const response = await fetch(`${this.url}/resources/${record.counter.id}`, {
                method: 'POST',
                headers: {
                    "Content-Type": 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(IGRecord)
            });

            this.logAPIResponse(response);

            if (response.ok) {
                const igRecord = (await response.json()) as ICounterRecordResponse;
                if (igRecord && igRecord.counterReading_id) {
                    return igRecord;
                }
            }
        }

        return undefined;
    }

    /* Log de respuestas de la API */
    private async logAPIResponse(response: Response) {
        if (!this.logger) {
            return;
        }

        if (response.ok) {
            this.logger.logInfo(response);
        } else {
            this.logger.logError(response);
            try {
                const errorResult = await response.json();
                this.logger.logError(errorResult as Object);
            } catch (error) {
                // Nada: No se puede 'parsear' la respuesta
            }
        }
    }
}