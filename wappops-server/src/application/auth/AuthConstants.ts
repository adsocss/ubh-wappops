import type { IUser } from "./IUser";

export const TOKEN_HTTP_HEADER = 'x-wappops-token';
export const DEVID_HTTP_HEADER = 'x-wappops-dev-id';

export const CENTER_SECURITY_COLUMN = 'sec_center_id';
export const DEPARTMENT_SECURITY_COLUMN = 'sec_department_id';

// Roles de las funcionalidades específicas de la aplicación.
export const FUNCTIONAL_ROLES = [
    'wappops-tasks', 'wappops-tasks-rw'
    , 'wappops-counters', 'wappops-counters-rw'
    , 'wappops-rooms-status', 'wappops-rooms-status-rw'
]

export const SYSTEM_USER: IUser = {
    id: 'system-user',
    username: 'system',
    roles: [],
    isAdmin: false,
    isSystem: true,
    authorizations: {
        centerIds: '*',
        departmentIds: '*'
    }
}
