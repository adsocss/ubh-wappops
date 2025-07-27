import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import type { IUser } from "../../../application/auth/IUser";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { ITaskDocument, TaskDocumentStatus } from "./ITaskDocument";

export class TaskDocumentRepository extends AbstractRepository<ITaskDocument, number> {
    public async findDocuments(user: IUser, tasksIds: number[]) {
        if (!tasksIds || tasksIds.length === 0) {
            return [];
        }

        const query = `
            SELECT * FROM (${QUERY}) AS D
            WHERE taskId IN(${tasksIds.join(',')})
        `;

        const documents = await this.db.execute(query);

        return documents.map(d => this.map(d));
    }

    protected map(row: DocumentRow): ITaskDocument {
        return {
            id: row.id,
            taskId: row.taskId,
            date: row.date,
            description: row.description,
            filename: row.filename,
            relativeUrl: row.relativeUrl,
            status: row.status as TaskDocumentStatus,
            center: {
                id: row.center$id,
                code: row.center$code,
                name: row.center$name
            }
        }
    }
    
    protected getQuery(): string {
        return QUERY;
    }
}

type DocumentRow = {
    id: number
    taskId: number
    date: Date
    description: string
    filename: string
    relativeUrl: string
    status: string
    center$id: number
    center$code: string
    center$name: string
}

const QUERY = `
SELECT
    Document_id_pk AS primary_key
    ,C.Center_id_pk AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
    ,Document_id_pk AS id,Task_id_fk AS taskId,[Date] AS [date]
    ,ISNULL(Description,'') AS [description],FileName AS [filename]
    ,CONCAT('/uploads/', D.AppCustomer_id_fk, '-', C.CenterCode, '/DocManagement/', FileName) AS relativeUrl
	,'sync' AS [status]
    ,C.Center_id_pk AS center$id, C.CenterCode AS center$code, C.[Name] AS center$name
FROM Documents AS D
INNER JOIN TaskHeader AS T ON T.Task_id_pk = D.Task_id_fk
INNER JOIN Centers AS C ON C.Center_id_pk = T.Center_id_fk
WHERE FileName IS NOT NULL
    AND (PATINDEX('%.gif', LOWER(FileName)) > 0
        OR PATINDEX('%.png', LOWER(FileName)) > 0
        OR PATINDEX('%.jpg', LOWER(FileName)) > 0
        OR PATINDEX('%.jpeg', LOWER(FileName)) > 0
	   )
`;
