import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { IWorkTime } from "./IWorkTime";

export class WorkTimeRepository extends AbstractRepository<IWorkTime, number> {
    protected map(row: any): IWorkTime {
        return {
            id: row.id,
            taskTypeId: row.taskTypeId,
            roomTypeId: row.roomTypeId,
            estimatedWorkTime: row.estimatedWorkTime
        };
    }
    
    protected getQuery(): string {
        return QUERY;
    }
}

const QUERY = `
SELECT
    TaskTypeXRoomTypeCenter_id_pk AS primary_key
    , RT.Center_id_fk AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
	, TaskTypeXRoomTypeCenter_id_pk AS id
	, TaskType_id_fk AS taskTypeId
	, RoomTypeCenter_id_fk AS roomTypeId
	, WorktimeEstimate estimatedWorkTime
FROM TaskTypeXRoomTypesPerCenter AS TT
INNER JOIN RoomTypesPerCenter AS RT ON RT.RoomTypeCenter_id_pk = TT.RoomTypeCenter_id_fk
`;