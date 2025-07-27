import type { IDepartment } from "../hhrr/IDepartment"

export interface ITaskType {
    id: number
    name: string
    estimatedWorkTime: number
    isCleanTask: boolean
    department: IDepartment
}