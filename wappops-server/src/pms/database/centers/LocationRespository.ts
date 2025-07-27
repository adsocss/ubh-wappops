import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { ICenterLocation } from "./ICenterLocation";

export class LocationRepository extends AbstractRepository<ICenterLocation, number> {
    protected map(row: LocationRow): ICenterLocation {
        return {
            id: row.id,
            code: row.code,
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

type LocationRow = {
    id: number
    code: string
    name: string
    center$id: number
    center$code: string
    center$name: string
}

const QUERY = `
SELECT
	CenterZone_id_pk AS primary_key
    ,C.Center_id_pk AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
	,CenterZone_id_pk AS id, CodZone AS code, [Description] AS [name]
	,C.Center_id_pk AS center$id, C.CenterCode AS center$code, C.[Name] AS center$name
FROM CenterZones AS L
INNER JOIN Centers AS C ON C.Center_id_pk = L.Center_id_fk
`;