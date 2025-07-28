import { IUser } from "@model/data-model";
import { CLIENT_CONFIG_KEY, DEVICE_ID_KEY, LAST_SYNC_KEY, USER_KEY, USER_NAME_KEY } from "./local-storage-keys";
import { createContext } from "@lit/context";
import { ApiService } from "./services/api-service";
import { WODatabase } from "./services/database";
import WOSynchronizer from "./services/synchronizer";
import { NotificationsService } from "./services/NotificationsService";
import { WebPushService } from "./services/WebPushService";
import { DEFAULT_CLIENT_CONFIGURATION, IClientConfiguration } from "../application/model/IClientConfiguration";


/**
 * Aplicación y contexto general.
 */
export class Wappops {
    public readonly appName: string = "UBH Operaciones"; // Nombre de la aplicación

    // Configuración de la URL de la API basada en el entorno
    private _apiUrl: string = this._getApiUrl();

    private _configuration: IClientConfiguration | undefined = undefined;
    private _currentUser: IUser | undefined = undefined;
    private _lastSync: Date | undefined = undefined;
    private _deviceId: string | undefined = undefined;
    private _locale: string = "es-ES"; // Español (no hay traducciones ni está previsto)

    // Servicios
    private _apiService: ApiService;
    private _dbService: WODatabase;
    private _syncService: WOSynchronizer;
    private _notificationsService: NotificationsService | undefined = undefined;
    private _webPushService: WebPushService | undefined = undefined;

    constructor() {
        this._getStoredData();
        
        // Log API URL in development for debugging
        if (import.meta.env.DEV) {
            console.log(`🔗 API URL: ${this._apiUrl}`);
            console.log(`🔗 VITE_API_URL env var: ${import.meta.env.VITE_API_URL}`);
        }
        
        // Inicializar servicios
        this._apiService = new ApiService(this._apiUrl);
        this._apiService.token = this._currentUser?.authorizations?.token;
        this._apiService.deviceId = this._deviceId;

        this._dbService = new WODatabase();
        this._syncService = new WOSynchronizer(this);
        this._notificationsService = new NotificationsService(this);
        this._webPushService = new WebPushService(this);
        
        // Listen for messages from Service Worker (push notifications)
        this._setupServiceWorkerMessageHandler();
    }

    get configuration(): IClientConfiguration {
        return this._configuration ?? DEFAULT_CLIENT_CONFIGURATION;
    }

    set configuration(config: IClientConfiguration) {
        this._configuration = config;
        localStorage.setItem(CLIENT_CONFIG_KEY, JSON.stringify(config));
    }

    /**
     * Devuelve la URL de la API.
     */
    get apiUrl(): string {
        return this._apiUrl;
    }

    /**
     * Devuelve el idioma de la aplicación.
     */
    get locale(): string {
        return this._locale;
    }

    /**
     * Establece el idioma de la aplicación.
     */
    set locale(locale: string) {
        this._locale = locale;
    }

    /**
     * Devuelve el usuario actual.
     */
    get currentUser(): IUser | undefined {
        return this._currentUser;
    }

    /**
     * Establece el usuario actual.
     * @param { IUser } user - El usuario actual.
     */
    set currentUser(user: IUser | undefined) {
        this._currentUser = user;
        if (user) {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            if (user.username) {
                localStorage.setItem(USER_NAME_KEY, user.username);
            }

            if (this._apiService) {
                this._apiService.token = user.authorizations.token;
            }
        } else {
            localStorage.removeItem(USER_KEY);
            if (this._apiService) {
                this._apiService.token = undefined;
            }
        }
    }

    /**
     * Reinicia la base de datos.
     * Elimina la base de datos actual y crea una nueva.
     * @deprecated
     */
    public async resetDatabase() {
        try {
            this._dbService.close();
            await this._dbService.delete();
            this._dbService = new WODatabase();
        } catch (error) {
            console.error("Error reinicializando la base de datos local:", error);
        }     
    }

    /**
     * Devuelve la fecha y hora de la última sincronización.
     */
    get lastSync(): Date | undefined {
        return this._lastSync;
    }

    /**
     * Establece la fecha y hora de la última sincronización.
     * @param { Date }  date La fecha y hora de la última sincronización.
     */
    set lastSync(date: Date) {
        this._lastSync = date;
        localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(date));
    }

    /**
     * Devuelve el servicio de la API.
     */
    get api(): ApiService {
        return this._apiService;
    }

    /**
     * Devuelve el servicio de la base de datos.
     */
    get db(): WODatabase {
        return this._dbService;
    }

    /**
     * Devuelve el servicio de sincronización.
     */
    get synchronizer(): WOSynchronizer {
        return this._syncService;
    }

    /**
     * Devuelve el servicio de notificaciones.
     */
    get notifications(): NotificationsService | undefined {
        return this._notificationsService;
    }

    /**
     * Devuelve el servicio de Web Push.
     */
    get webPush(): WebPushService | undefined {
        return this._webPushService;
    }

    /**
     * Determina la URL de la API basada en el entorno de ejecución.
     * En desarrollo apunta directamente al servidor backend en puerto 3000.
     * En producción, usa el mismo origen que la aplicación.
     */
    private _getApiUrl(): string {
        // Si hay una variable de entorno específica, usarla
        if (import.meta.env.VITE_API_URL !== undefined) {
            return import.meta.env.VITE_API_URL;
        }
        
        // En modo desarrollo, apuntar directamente al servidor backend
        if (import.meta.env.DEV) {
            // Usar directamente la URL del servidor backend
            const apiUrl = `${window.location.protocol}//${window.location.hostname}:3000`;
            return apiUrl;
        } else {
            // En producción, usar el mismo origen (servidor sirve tanto API como frontend)
            return window.location.origin;
        }
    }

    /* Lee la información de la aplicación almacenada en localstorage */
    private _getStoredData() {
        // Configuración
        this._configuration = localStorage.getItem(CLIENT_CONFIG_KEY)
            ? JSON.parse(localStorage.getItem(CLIENT_CONFIG_KEY) as string)
            : DEFAULT_CLIENT_CONFIGURATION;

        // Usuario
        this._currentUser = localStorage.getItem(USER_KEY) ? JSON.parse(localStorage.getItem(USER_KEY) as string) : undefined;

        // Sincronización
        this._lastSync = new Date(localStorage.getItem(LAST_SYNC_KEY) ?? new Date());

        // Identificador de dispositivo (Crypto API solo disponible en HTTPS y localhost)
        this._deviceId = localStorage.getItem(DEVICE_ID_KEY) ?? undefined;
        if (!this._deviceId && (window.location.protocol === "https:" || window.location.hostname === "localhost")) {
            this._deviceId = self.crypto.randomUUID();
            localStorage.setItem(DEVICE_ID_KEY, JSON.stringify(this._deviceId));
        }
    }

    /**
     * Setup Service Worker message handler for push notifications
     */
    private _setupServiceWorkerMessageHandler() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('🔔 [APP] Received message from Service Worker:', event.data);
                
                if (event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
                    console.log('🔔 [APP] Processing push notification from SW:', event.data.notification);
                    
                    // Pass the notification to the NotificationsService for processing
                    if (this._notificationsService) {
                        this._notificationsService.handleNotification(event.data.notification);
                    }
                }
            });
            
            console.log('🔔 [APP] Service Worker message handler registered');
        }
    }
}

/**
 * Definición del contexto de la aplicación.
 */
export const wappops = createContext<Wappops>(Symbol("wappops"));
