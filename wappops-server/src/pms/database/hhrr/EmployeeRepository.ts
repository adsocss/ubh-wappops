import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { IEmployee } from "./IEmployee";

export class EmployeeRepository extends AbstractRepository<IEmployee, number> {
    protected map(row: EmployeeRow): IEmployee {
        return {
            id: row.id,
            name: row.name,
            surname1: row.surname1,
            surname2: row.surname2,
            fullName: row.fullName,
            startsOn: row.startsOn,
            endsOn: row.endsOn,
            center: {
                id: row.center$id,
                code: row.center$code,
                name: row.center$name
            },
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

type EmployeeRow = Omit<IEmployee, 'center' | 'department'>
    & {
        center$id: number
        center$code: string
        center$name: string
        department$id: number
        department$name: string
        department$type: number
        department$locked: boolean        
    }

const QUERY = `
SELECT
	EC.Employee_id_fk AS primary_key
	,EC.Center_id_fk AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
    , EC.Employee_id_fk AS id
    , ISNULL(E.[name],'') AS [name], ISNULL(E.Surname1,'') AS surname1, ISNULL(E.Surname2,'') AS surname2
        , TRIM(ISNULL(E.Surname1,'') + ' ' +  ISNULL(E.Surname2,'') + CASE WHEN E.[name] IS NULL THEN '' ELSE ', ' + E.[name] END) AS fullName
    , EC.InitialDate AS [startDate], EC.EndDate AS endDate
	, C.*, D.*
FROM RRHH_EmployeesContracts AS EC
INNER JOIN (
SELECT DISTINCT
    Employee_id_fk AS employee_id
    , FIRST_VALUE(EmployeeContract_id_pk) OVER (PARTITION BY Employee_id_fk ORDER BY EndDate DESC) AS last_contract_id
FROM RRHH_EmployeesContracts
) AS LC ON LC.last_contract_id = EC.EmployeeContract_id_pk
INNER JOIN RRHH_Employees AS E ON E.Employee_id_pk = EC.Employee_id_fk
INNER JOIN (
	SELECT Center_id_pk AS center$id,CenterCode AS center$code,[Name] AS center$name FROM Centers
) AS C ON C.center$id = EC.Center_id_fk
INNER JOIN (
    SELECT
         Department_id_pk AS department$id,[Name] AS department$name
		 ,ISNULL([Type],99) AS department$type,Locked AS department$locked
     FROM Departments
) AS D ON D.department$id = EC.Department_id_fk

`