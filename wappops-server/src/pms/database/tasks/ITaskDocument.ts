import type { ICenter } from "../centers/ICenter"

export type TaskDocumentStatus = 'new' | 'sync' | 'deleted';

export interface ITaskDocument {
    id: number
	taskId: number
    date: Date
    description: string
    filename: string
	relativeUrl: string | undefined
	status: TaskDocumentStatus
	center: ICenter,

    contents: Blob | undefined
}