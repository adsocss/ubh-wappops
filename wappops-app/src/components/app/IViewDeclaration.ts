/**
 * Array de las vistas disponibles en la aplicación.
 */
export const Views = ['login', 'tasks', 'rooms-status', 'resource-counters', 'synchronization', 'preferences'] as const;

/**
 * Definición del tipo de vista
 */
export type ViewType = typeof Views[number];

/**
 * Declaración de vista.
 */
export interface IViewDeclaration {
    key: ViewType
    title: string
    icon: string
    permissions: string[] | 'any' | 'none'
}