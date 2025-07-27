import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { ITaskType } from "./ITaskType";

export class TaskTypeRepository extends AbstractRepository<ITaskType, number> {
    protected map(row: TaskTypeRow): ITaskType {
        return {
            id: row.id,
            name: row.name,
            estimatedWorkTime: row.estimatedWorkTime,
            isCleanTask: row.isCleanTask ? true : false,
            department: {
                id: row.department$id,
                name: row.department$name,
                type: row.department$type,
                locked: row.department$locked
            }
        }
    }

    protected getQuery(): string {
        return QUERY;
    }
}

type TaskTypeRow = {
    id: number,
    name: string,
    estimatedWorkTime: number,
    isCleanTask: boolean
    department$id: number
    department$name: string
    department$type: number
    department$locked: boolean
}

const QUERY = `
SELECT
    TaskType_id_pk AS primary_key
    ,NULL AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
	,TaskType_id_pk AS id, TT.[Name] AS [name], ISNULL(WorktimeEstimate,0) AS estimatedWorkTime
	,CASE WHEN SUBSTRING(UPPER(TRIM(TT.[Name])),1,3) = '@PL' THEN 1 ELSE 0 END AS isCleanTask
	,D.Department_id_pk AS department$id, D.[Name] AS department$name, ISNULL(D.[Type],99) AS department$type,D.Locked AS department$locked
FROM TaskTypes AS TT
INNER JOIN Departments AS D ON D.Department_id_pk = TT.Department_id_fk
`;