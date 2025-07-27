import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { IRoomRange } from "./IRoomRange";

export class RoomRangeRepository extends AbstractRepository<IRoomRange, number> {
    protected map(row: any): IRoomRange {
        return {
            id: row.id,
            name: row.name,
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

const QUERY = `
SELECT
	RoomRange_id_pk AS primary_key
    ,C.Center_id_pk AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
    ,RoomRange_id_pk AS id
    ,RangeDescription AS [name]
    ,TypeAgrupation AS [type]
    ,C.Center_id_pk AS center$id, C.CenterCode AS center$code, C.[Name] AS center$name
FROM [RoomRanges] AS R
INNER JOIN Centers AS C ON C.Center_id_pk = R.Center_id_fk
WHERE R.TypeAgrupation = 2
`;