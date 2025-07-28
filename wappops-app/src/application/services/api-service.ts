import type {
    IUser,
    IAsset, ICenter, ICenterBlock, ICenterLocation, ICounterRecord,
    ICredentials, IDepartment, IEmployee, IFloor, IResourceCounter,
    IResultSetPage, IRoom, IRoomRange, ITask, ITaskDocument, ITaskEnum, ITaskType,
    IReservation,
    IWorkTime,
} from "../model/data-model";

import { mapTask } from "../model/data-model";
import { remapTask } from "./synchronizer";

/**
 * Excepción para errores de la API.
 */
export class APIException {
    readonly status: number;
    readonly statusText: string;
    readonly message: string | undefined;

    constructor(status: number, statusText: string, message: string | undefined = undefined) {
        this.status = status;
        this.statusText = statusText;
        this.message = message ?? statusText;
    }
}

/**
 * Página inicial de resultados por defecto para entidades
 * con clave primaria numérica, que son todas para este 
 * cliente de la API.
 */
const DEFAULT_RESULT_PAGE: IResultSetPage<any, number> = {
    cursor: 0,
    rows: 200,
    sort: []
}

/**
 * Cliente de la API de WappOps.
 */
export class ApiService {
    private _apiUrl: string;
    private _token: string | undefined = undefined;
    private _deviceId: string | undefined = undefined;

    /**
     * Contructor de la clase ApiService
     * @param { string } apiUrl - URL de la API
     */
    constructor(apiUrl: string) {
        this._apiUrl = apiUrl;
    }

    /**
     * Establece el token de la API
     * @param { string } token - Token de la API
     */
    set token(token: string | undefined) {
        this._token = token;
    }

    /**
     * Establece el ID del dispositivo
     * @param { string } deviceId - ID del dispositivo
     */
    set deviceId(deviceId: string | undefined) {
        this._deviceId = deviceId;
    }

    /**
     * Valida la sesión del usuario
     * @returns { IUser } - Usuario si la sesión es válida.
     */
    public async validateSession(): Promise<IUser> {
        return this._apiFetch(`api/login/validate`);
    }

    /**
     * Login en la API
     * @param { ICredentials } credentials - Credenciales de usuario
     * @returns { IUser | Error } - Usuario o error
     */
    public async login(credentials: ICredentials, options: RequestInit = {}): Promise<IUser | Error> {
        const response = await this._apiFetch(`api/login`, {
            method: "POST", body: JSON.stringify(credentials),
            ...options,
        });

        if (!(response instanceof Error)) {
            this._token = (response as IUser).authorizations?.token;
        }

        return response;
    };

    /**
     * Logout en la API.
     * @returns { Promise<boolean> } - Devuelve siempre true en esta versión. La única
     *                                 finalidad del logout es la de generar un registro
     *                                 de log en el servidor.
     */
    public async logout(): Promise<boolean> {
        try {
            await this._apiFetch(`api/logout`, {
                method: "POST",
            });

        } catch (_error) {
            // Ignorar error
        }

        return true;
    }

    /**
     * Generic GET request
     * @param endpoint - API endpoint (without leading slash)
     * @param options - Additional fetch options
     * @returns Promise with response data
     */
    public async get(endpoint: string, options: RequestInit = {}): Promise<any> {
        return this._apiFetch(endpoint, {
            method: "GET",
            ...options,
        });
    }

    /**
     * Generic POST request
     * @param endpoint - API endpoint (without leading slash)
     * @param data - Data to send in request body
     * @param options - Additional fetch options
     * @returns Promise with response data
     */
    public async post(endpoint: string, data?: any, options: RequestInit = {}): Promise<any> {
        return this._apiFetch(endpoint, {
            method: "POST",
            body: data ? JSON.stringify(data) : undefined,
            ...options,
        });
    }

    public fetchCenters(page: IResultSetPage<ICenter, number> = DEFAULT_RESULT_PAGE): Promise<ICenter[]> {
        return this._apiFetchPage<ICenter>(`api/centers`, page);
    }

    public fetchCentersBlocks(page: IResultSetPage<ICenterBlock, number> = DEFAULT_RESULT_PAGE): Promise<ICenterBlock[]> {
        return this._apiFetchPage<ICenterBlock>(`api/centers/blocks`, page);
    }

    public fetchFloors(page: IResultSetPage<IFloor, number> = DEFAULT_RESULT_PAGE) {
        return this._apiFetchPage<IFloor>(`api/centers/floors`, page);
    }

    public fetchRooms(page: IResultSetPage<IRoom, number> = DEFAULT_RESULT_PAGE) {
        return this._apiFetchPage<IRoom>(`api/centers/rooms`, page);
    }

    public fetchLocations(page: IResultSetPage<ICenterLocation, number> = DEFAULT_RESULT_PAGE) {
        return this._apiFetchPage<ICenterLocation>(`api/centers/locations`, page);
    }

    public fetchDepartments(page: IResultSetPage<IDepartment, number> = DEFAULT_RESULT_PAGE) {
        return this._apiFetchPage<IDepartment>(`api/hhrr/departments`, page);
    }

    public fetchEmployees(page: IResultSetPage<IEmployee, number> = DEFAULT_RESULT_PAGE) {
        return this._apiFetchPage<IEmployee>(`api/hhrr/employees`, page);
    }

    public fetchRoomRanges(page: IResultSetPage<IRoomRange, number> = DEFAULT_RESULT_PAGE) {
        return this._apiFetchPage<IRoomRange>(`api/housekeeping/roomranges`, page);
    }

    public fetchAssets(page: IResultSetPage<IAsset, number> = DEFAULT_RESULT_PAGE) {
        return this._apiFetchPage<IAsset>(`api/maintenance/assets`, page);
    }

    public fetchCounters(page: IResultSetPage<IResourceCounter, number> = DEFAULT_RESULT_PAGE) {
        return this._apiFetchPage<IResourceCounter>(`api/maintenance/counters`, page);
    }

    public fetchCountersRecords(page: IResultSetPage<ICounterRecord, number> = DEFAULT_RESULT_PAGE) {
        return this._apiFetchPage<ICounterRecord>(`api/maintenance/counters/records`, page);
    }

    public async fetchTasks(page: IResultSetPage<ITask, number> = DEFAULT_RESULT_PAGE) {
        const tasks = await this._apiFetchPage<ITask>(`api/tasks`, page);
        for (const task of tasks) {
            task.documents = await this.fetchTasksDocuments(task);
        }

        return tasks;
    }

    public fetchTaskEnums(page: IResultSetPage<ITaskEnum<any>, number> = DEFAULT_RESULT_PAGE) {
        return this._apiFetchPage<ITaskEnum<any>>(`api/tasks/enums`, page);
    }

    public fetchTaskTypes(page: IResultSetPage<ITaskType, number> = DEFAULT_RESULT_PAGE) {
        return this._apiFetchPage<ITaskType>(`api/tasks/types`, page);
    }

    public async fetchWorkTimes(page: IResultSetPage<IWorkTime, number> = DEFAULT_RESULT_PAGE) {
        return this._apiFetchPage<IWorkTime>(`api/tasks/worktimes`, page);
    }

    public async fetchTasksDocuments(task: ITask): Promise<ITaskDocument[]> {
        if (!task || (task.documents ?? []).length === 0) {
            return Promise.resolve([]);
        }

        const documents: ITaskDocument[] = [];
        for (const document of (task.documents ?? [])) {
            if (document.id) {
                const url = `${this._apiUrl}/api/tasks/documents/${document.id}`;
                try {
                    const response = await fetch(url, {
                        headers: this.getAPIHeaders()
                    });

                    // Si la respuesta es correcta, se convierte el blob.
                    // Tener en cuenta que la API devolverá el código 204
                    // si el archivo del documento no existe.
                    if (response.ok && response.status === 200) {
                        document.contents = await response.blob();
                        documents.push(document);
                    }
                } catch (_error) {
                    // Ignorar error: puede que el documento no exista en Guest
                    console.error('docs error ', _error)
                }
            }
        }

        return documents;
    }

    public async fetchBooking(page: IResultSetPage<IReservation, number> = DEFAULT_RESULT_PAGE) {
        return this._apiFetchPage<IReservation>(`api/booking`, page);
    }

    public async sendTask(task: ITask): Promise<ITask | undefined> {
        // Si no hay conexión a Internet, no se envía la tarea
        // y se devuelve el valor 'undefined'.
        if (!navigator.onLine) {
            return undefined;
        }

        const url = task.id
            ? `${this._apiUrl}/api/tasks/${task.id}`
            : `${this._apiUrl}/api/tasks`;

        // Conversión al formato propio de la API de Guest PMS.
        // En este caso, el servidor actua como 'proxy' transparente
        // de la API de Guest.
        const gTask = mapTask(task) as Record<string, any>;
        const formData = new FormData();
        Object.keys(gTask).forEach(key => {
            if (gTask[key] !== undefined && gTask[key] !== null && key !== 'documents') {
                formData.append(key, gTask[key])
            }
        });

        if (task.documents) {
            // Solo se envían los documentos nuevos adjuntados en el dispositivo.
            task.documents.filter(doc => doc.status === 'new').forEach(doc => {
                if (doc.contents) {
                    formData.append(`documents`, doc.contents as Blob);
                }
            });
        }

        // Se excluye la cabecera Content-Type para que el servidor lo
        // establezca automáticamente. Si se especifica ('multipart/form-data'),
        // el servidor no lo procesará correctamente (se produce un error).
        let result: ITask | undefined = undefined;
        const method = task.id ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, {
                method: method,
                headers: this.getAPIHeaders(),
                body: formData,
            });

            if (!response.ok) {
                this.throwException(response);
            }

            // Si se finaliza una tarea, ésta puede quedar fuera de los límites
            // configurados para las sincronizaciones y, por tanto, el servidor
            // no devolverá nada.
            if (response.status === 200) {

                // Devolver la tarea devuelta por el servidor
                result = remapTask(await response.json() as ITask);
            } else {
                // Probablemente ya no existe (eliminada)
                // Marcar como sincronizada para evitar reenvíos constantes
                if (response.status === 204) {
                    result = { ...task, syncStatus: 'synced' };
                }

                // Devolver la misma tarea envíada para que quede
                // en el dispositivo mientras no se resincronice.
                result = task;
            }


        } catch (error) {
            if (method === 'PUT') {
                // Probablemente ya no existe (eliminada)
                // Marcar como sincronizada para evitar reenvíos constantes
                result = { ...task, syncStatus: 'synced' };
            } else {
                this.throwException(error as Error);
            }
        }

        return result as ITask;
    }

    public async sendRoomStatus(room: IRoom) {
        const result = await this._apiFetch(`api/housekeeping/roomstatus/${room.id}`, {
            method: "PUT",
            body: JSON.stringify(room)
        });

        return result;
    }

    public async sendCounterRecord(record: ICounterRecord) {
        return this._apiFetch('api/maintenance/counters/records', {
            method: "POST",
            body: JSON.stringify(record)
        }) as unknown as ICounterRecord;
    }

    /* Método general de petición de página de datos */
    private async _apiFetchPage<T>(endpoint: string, page: IResultSetPage<T, number> = DEFAULT_RESULT_PAGE) {
        const url = `${endpoint}?cursor=${page.cursor}&rows=${page.rows}&sort=${page.sort.join(",")}`;
        return this._apiFetch(url) as unknown as T[];
    }

    /* Método general de petición a la API */
    private async _apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...this.getAPIHeaders(),
        };

        options.headers = { ...headers, ...options.headers };

        // Handle leading slash to avoid double slashes in URL
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        const requestUrl = `${this._apiUrl}/${cleanEndpoint}`;

        try {
            const response = await fetch(requestUrl, options);
            if (!response.ok) {
                this.throwException(response);
            }

            return response.json();
        } catch (error) {
            this.throwException(error as Error);
        }
    }

    /* Obtener las cabeceras HTTP propias de la API */
    private getAPIHeaders(): HeadersInit {
        const headers: HeadersInit = {};
        if (this._token) {
            headers["Authorization"] = `Bearer ${this._token}`;
        }
        if (this._deviceId) {
            headers["X-Device-ID"] = this._deviceId;
        }

        return headers;
    }

    /**
     * Lanzar una excepción en caso de error
     */
    private throwException(response: Response | Error) {
        let status = 0;
        let statusText = "Unknown error";
        let message = undefined;

        if (response instanceof Error) {
            statusText = response.message;
            if (navigator.onLine) {
                status = 1001;
                message = "Error de conexión con el servidor. Informe al administrador.";
            } else {
                status = 1000;
                message = "Error de red. Verifique su conexión a Internet.";
            }
        } else {
            status = response.status;
            statusText = response.statusText;
            if (response.status === 401) {
                message = "Acceso denegado";
            } else if (response.status === 404) {
                message = "Error: Recurso no encontrado. Informe al administrador.";
            } else if (response.status === 500) {
                message = "Error interno del servidor. Informe al administrador.";
            }
        }

        throw new APIException(status, statusText, message);
    }
}