import type { ICenter } from "../centers/ICenter"
import type { ICenterLocation } from "../centers/ICenterLocation"
import type { IRoom } from "../centers/IRoom"
import type { IDepartment } from "../hhrr/IDepartment"
import type { IEmployee } from "../hhrr/IEmployee"
import type { IAsset } from "../maintenance/IAsset"
import type { ITaskDocument } from "./ITaskDocument"
import type { ITaskEnum } from "./ITaskEnum"
import type { ITaskType } from "./ITaskType"

export interface ITask {
    id: number | undefined
	number: number | undefined
	status: ITaskEnum<`status`>
	priority: ITaskEnum<'priority'>
	description: string
	locksRoom: boolean
	lockPlanned: boolean
	scheduled: boolean
	insuranceNotified: boolean
	courtesyCallDone: boolean

	createdOn: Date
	notifiedOn: Date | undefined
	startedOn: Date | undefined
	closedOn: Date | undefined

	center: ICenter
	department: IDepartment
	taskType: ITaskType

	targetType: ITaskEnum<'target-type'>
	taskTarget: IAsset | ICenterLocation | IRoom | undefined

	createdByUsername: string | undefined
    createdBy: IEmployee | undefined
	notifiedBy: IEmployee | undefined
	reportTo: IEmployee | undefined
	assignedTo: IEmployee | undefined

	workTime: number;

	documents?: ITaskDocument[]

	localId?: number
	syncStatus?: 'synced' | 'pending' | 'deleted'
	requestCleaning?: boolean
}