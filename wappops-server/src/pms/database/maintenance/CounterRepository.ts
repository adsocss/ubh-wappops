import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { IResourceCounter } from "./IResourceCounter";

export class CounterRepository extends AbstractRepository<IResourceCounter, number> {
    protected map(row: CounterRow): IResourceCounter {
        return {
            id: row.id,
            name: row.name,
            unitOfMeasure: row.unitOfMeasure,
            incremental: row.incremental ? true : false,
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

type CounterRow = {
    id: number
    name: string
    unitOfMeasure: string
    incremental: boolean
    center$id: number
    center$code: string
    center$name: string
}


const QUERY = `
SELECT
    ResourceCounter_id_pk AS primary_key
    ,C.Center_id_pk AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
    ,ResourceCounter_id_pk AS id
    ,Description AS [name]
    ,MeasureUnit AS unitOfMeasure
    ,CASE WHEN RC.[Type] = 1 THEN 1 ELSE 0 END AS incremental
    ,C.Center_id_pk AS center$id, CenterCode AS center$code, C.[Name] AS center$name
FROM ResourceCounters AS RC
INNER JOIN Centers AS C ON C.Center_id_pk = RC.Center_id_fk    
`;