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
    wsConnection?: any // No se usa en este cliente, pero puede ser útil para otras implementaciones.
}

export class GuestAPIClient {
    private url: string;
    private sessions: Map<string, Session> = new Map();
    private logger: Logger | undefined;

    /**
     * Constructor
     * @param { IApplicationConfiguration } configuration - Configuración general de la aplicación.
     * @param { Logger } logger - Instancia del servicio de logging (opcional).
     */
    constructor(configuration: IApplicationConfiguration, logger: Logger | undefined = undefined) {
        this.url = configuration.pms.api.dataHost.toString();
        this.logger = logger;
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
     * Determinar el estado del servicio de la API de Guest PMS.
     * @returns { Promise<'ok' | 'failing'> } - 'ok' si la API está activa, 'failing' si no.
     */
    public async status(): Promise<'ok' | 'failing'> {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            controller.abort()
            throw new Error('Timeout al comprobar el estado de la API de Guest PMS');
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
            return 'ok';
        } catch (error) {
            controller.abort();
            return 'failing';
        } finally {
            clearTimeout(timer);
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

    /* Login en la API de Guest PMS */
    public async apiLogin(username: string, password: string): Promise<boolean> {
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

            return true;
        }

        this.logAPIResponse(response);

        return false;
    }

    /* Refresco de tokens en la API de Guest PMS */
    private async refreshTokens(session: Session): Promise<boolean> {
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
            return true;
        }

        return false;
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
            this.logger.info(response);
        } else {
            this.logger.error(response);
            try {
                const errorResult = await response.json();
                this.logger.error(errorResult as Object);
            } catch (error) {
                // Nada: No se puede 'parsear' la respuesta
            }
        }
    }
}