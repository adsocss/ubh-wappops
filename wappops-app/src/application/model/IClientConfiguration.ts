import { IDepartment } from "./data-model";

/**
 * Interfase para la configuración de la App cliente.
 */
export interface IClientConfiguration {
    preferences: {
        notifications: {
            departments: IDepartment[]; // Departamentos seleccionados para recibir notificaciones
            vibration: 'enabled' | 'disabled'; // Estado de la vibración (habilitada o deshabilitada)
            sound: {
                enabled: boolean; // Indica si el sonido de notificación está habilitado
                repeat: number; // Número de repeticiones del tono de alerta
                volume: number; // Volumen del sonido (0 a 1)
            }
        };
        theme: 'light' | 'dark'; // Tema de la aplicación (ej. "light", "dark")
    }
}

/**
 * Configuración por defecto para la aplicación cliente.
 */
export const DEFAULT_CLIENT_CONFIGURATION: IClientConfiguration = {
    preferences: {
        notifications: {
            departments: [],
            vibration: 'enabled',
            sound: {
                enabled: true,
                repeat: 1, 
                volume: 1 
            }
        },
        theme: 'light' // Tema claro por defecto
    }
};