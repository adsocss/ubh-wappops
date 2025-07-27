import type { IGTaskDocument } from "./IGTaskDocument"

export interface IGTask {
    task_id?: number
    centerCode: string
    taskType_id:number
    taskTypeCode?: string
    dateCommunication: string | null
    dateStartingTask: string | null
    dateEndingTask: string | null
    status: number | null
    room_code: string | null
    lockedRoom?: boolean
    centerZone_code: string | null
    asset_id: number | null
    store_id: number | null
    priority: number
    lockPrevision?: boolean
    creationUser?: string | null
    employeeInformed_id: number | null
    employeeRepair_id: number | null
    employeeNoticed_id: number | null
    courtesyCall: number | null
    insuranceNotified?: boolean
    observations: string
    worktimeEstimate: number | null
    documents?: IGTaskDocument[]
}