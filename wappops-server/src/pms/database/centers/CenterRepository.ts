import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { ICenter } from "./ICenter";

export class CenterRepository extends AbstractRepository<ICenter, number> {
    protected map(row: any): ICenter {
        return row as ICenter
    }

    protected getQuery(): string {
        return QUERY;
    }
}

const QUERY = `
    SELECT Center_id_pk AS primary_key
    ,Center_id_pk AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
    ,Center_id_pk AS id, CenterCode AS code, [Name] AS [name] FROM Centers
    WHERE Center_id_pk > 0
`