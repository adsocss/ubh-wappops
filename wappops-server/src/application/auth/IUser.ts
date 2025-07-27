import type { IDepartment } from "../../pms/database/hhrr/IDepartment"
import type { IEmployee } from "../../pms/database/hhrr/IEmployee"

export interface IUser {
    id: string
    username: string
    isSystem?: boolean
    isAdmin?: boolean
    roles: string[];
    department?: IDepartment
    employee?: IEmployee
    authorizations: {
        centerIds: '*' | number[]
        departmentIds: '*' | number[]
        token?: string
    }
}