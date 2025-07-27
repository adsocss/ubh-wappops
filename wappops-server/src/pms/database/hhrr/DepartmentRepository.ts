import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { IDepartment } from "./IDepartment";

export class DepartmentRepository extends AbstractRepository<IDepartment,number> {
    protected map(row: any): IDepartment {
        return row as IDepartment;
    }

    protected getQuery(): string {
        return QUERY;
    }
}

const QUERY = `
    SELECT Department_id_pk AS primary_key
        ,NULL AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
        ,Department_id_pk AS id, [Name] AS [name], ISNULL([Type],99) AS [type], Locked AS locked
    FROM Departments
`;
