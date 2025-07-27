import { toLocalISOString } from "../../../application/utils/datetimeutils";
import type { ICenterLocation } from "../../database/centers/ICenterLocation";
import type { IRoom } from "../../database/centers/IRoom";
import type { IAsset } from "../../database/maintenance/IAsset";
import type { ITask } from "../../database/tasks/ITask";
import type { ITaskDocument } from "../../database/tasks/ITaskDocument";
import type { IGTask } from "./IGTask";
import type { IGTaskDocument } from "./IGTaskDocument";

export function mapTask(task: ITask) {
    const gTask: IGTask = {
        task_id: task.id ?? undefined,
        centerCode: task.center.code,
        taskType_id: task.taskType.id,
        dateCommunication: toLocalISOString(task.notifiedOn ?? new Date()),
        dateStartingTask: toLocalISOString(task.startedOn ?? new Date()),
        dateEndingTask: task.closedOn ? toLocalISOString(task.closedOn as Date) : null,
        status: task.status.enumValue,
        room_code: task.targetType.code === 'room' ? (task.taskTarget as IRoom).number : null,
        lockedRoom: task.locksRoom ?? null,
        centerZone_code:task.targetType.code === 'location' ? (task.taskTarget as ICenterLocation).code : null,
        asset_id: task.targetType.code === 'asset' ? (task.taskTarget as IAsset).id : null,
        store_id: task.targetType.code === 'asset' ? (task.taskTarget as IAsset).store.id : null,
        priority: task.priority.enumValue,
        lockPrevision: task.lockPlanned ?? false,
        employeeInformed_id: task.notifiedBy?.id ?? null,
        employeeRepair_id: task.assignedTo?.id ?? null,
        employeeNoticed_id: task.reportTo?.id ?? null,
        courtesyCall: (task.courtesyCallDone ?? false) ? 2 : 0,
        insuranceNotified: task.insuranceNotified ?? false,
        observations: task.description ?? '',
        worktimeEstimate: task.workTime ?? null,

        documents: task.documents?.filter(d => d.status === 'new').map(d => mapTaskDocument(d))
    };


    return gTask;
}

export function mapTaskDocument(document: ITaskDocument): IGTaskDocument {
    return {
        document_id: document.id,
        date: document.date,
        description: document.description,
        fileName: document.filename,
        contents: document.contents,
    }
}

