import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import { AuthorizationException } from "../../../application/auth/AuthorizationException";
import type { IUser } from "../../../application/auth/IUser";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { IDatabase } from "../../../application/db/IDatabase";

export class UserRepository extends AbstractRepository<IUser, string> {

    constructor(database: IDatabase) {
        super(database, 'string')
    }

    public async findByUsername(user: IUser, usernames: string[]): Promise<IUser[]> {
        if (!(user.isSystem || user.isAdmin)) {
            throw new AuthorizationException(user, 'Recurso "USER" no autorizado');
        }

        if ((usernames ?? []).length === 0) {
            return [];
        }

        const valueList = usernames.map(un => `'${un}'`).join(',');
        const query = `SELECT * FROM (${QUERY}) AS U WHERE username IN(${valueList})`;

        return (await this.db.execute(query)).map(row => this.map(row));
    }

    protected map(row: UserRow): IUser {
       
        // Roles configurados
        const userRoles = row.role$role_keys?.split(',').map(r => r.trim().toLowerCase());
        // Roles efectivos
        const roles = this.mapCompatibilityRoles(userRoles);

        const authCenterIds = this.mapToIdsList(row.restricted_centers_ids);
        const allDepartmentsAuth = roles.includes('wappops-departments-all');

        return {
            id: row.id,
            username: row.username,
            isSystem: false,
            isAdmin: roles.includes('wappops-admin'),
            roles: roles,
            department: {
                id: row.department$id,
                name: row.department$name,
                type: row.department$type,
                locked: row.department$locked
            },
            employee: {
                id: row.employee$id,
                name: row.employee$name,
                surname1: row.employee$surname1,
                surname2: row.employee$surname2,
                fullName: row.employee$fullName,
                startsOn: row.employee$startsOn,
                endsOn: row.employee$endsOn,
                center: {
                    id: row.employee$center$id,
                    code: row.employee$center$code,
                    name: row.employee$center$name,
                },
                department: {
                    id: row.employee$department$id,
                    name: row.employee$department$name,
                    type: row.employee$department$type,
                    locked: row.employee$department$locked
                }
            },
            authorizations: {
                centerIds: authCenterIds ?? '*',
                departmentIds: allDepartmentsAuth ? '*' : [row.department$id]
            }
        }
    }

    protected getQuery(): string {
        return QUERY;
    }

    private mapToIdsList(value: string | null | undefined): number[] | undefined {
        if (!value) return undefined;
        const ids = value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

        return ids.length === 0 ? undefined : ids;
    }


    /**
     * Compatibilidad con los roles de las versión 0.4.1-alpha y anteriores.
     * Añade los roles necesarios de esta versión según la configuración vigente
     * de las versiones anteriores.
     * @param { string[] | undefined } userRoles - Roles configurados para el usuario.
     * @returns { string[] } - Lista de roles compatibles con la versión actual.
     */
    private mapCompatibilityRoles(userRoles: string[] | undefined): string[] {
        if (!userRoles) return [];
        const roles = new Set<string>(userRoles);

        // Todos
        roles.add('wappops');

        // SS.TT.
        if (userRoles.includes('movil-sstt')) {
            roles.add('wappops-tasks-rw');
            roles.add('wappops-counters-rw');
        }

        // Pisos
        if (userRoles.includes('movil-pisos')) {
            roles.add('wappops-tasks-rw');
            roles.add('wappops-rooms-status-rw');
        }

        // Horizontal
        if (userRoles.includes('movil-tareas-todas')) {
            roles.add('wappops-departments-all');
        }

        // Dirección hotel
        if (userRoles.includes('movil-direccion')) {
            roles.add('wappops-tasks-rw');
            roles.add('wappops-manager-all')
            roles.add('wappops-counters-rw');
            roles.add('wappops-rooms-status-rw')
            roles.add('wappops-departments-all');
        }

        return Array.from(roles);
    }

}

type UserRow = {
    id: string
    username: string
    role$role_keys: string
    restricted_centers_ids: string    
    department$id: number
    department$name: string
    department$type: number
    department$locked: boolean
    employee$id: number
    employee$name: string
    employee$surname1: string
    employee$surname2: string
    employee$fullName: string
    employee$startsOn: Date
    employee$endsOn: Date
    employee$center$id: number
    employee$center$code: string
    employee$center$name: string
    employee$department$id: number
    employee$department$name: string
    employee$department$type: number
    employee$department$locked: boolean
};

const QUERY = `
SELECT
    CAST(U.UserId AS VARCHAR(64)) AS primary_key
    ,NULL AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
	,CAST(U.UserId AS VARCHAR(64)) AS id, U.UserName AS username
	,R.role$role_keys, AC.restricted_centers_ids
	,D.Department_id_pk AS department$id, D.[Name] AS department$name, ISNULL(D.[Type],99) AS department$type, D.Locked AS department$locked
	,E.*
FROM aspnet_Users AS U
INNER JOIN [aspnet_Membership] AS M ON M.UserId = U.UserId
LEFT JOIN Departments AS D ON D.Department_id_pk = M.Department_id_fk
INNER JOIN (
SELECT
	UserId AS role$userId
	,STRING_AGG([Description], ',') AS role$role_keys
FROM UsersRoles AS UR
INNER JOIN AppCustomerRoles AS R ON R.AppCustomerRole_id_pk = UR.AppCustomerRole_id_fk
--WHERE [Description] LIKE('wappops%')
GROUP BY UserId
) AS R ON R.role$userId = U.UserId
LEFT JOIN (
SELECT
    userId, STRING_AGG(CAST(Center_id_fk AS VARCHAR(64)), ',') AS restricted_centers_ids
FROM RoleCenterMenuItems AS RC
LEFT JOIN AppCustomerRoles AS ROL ON ROL.AppCustomerRole_id_pk = RC.Role_id_fk
LEFT JOIN UsersRoles AS UR ON UR.AppCustomerRole_id_fk = ROL.AppCustomerRole_id_pk
GROUP BY UserId
) AS AC ON AC.UserId = U.UserId
LEFT JOIN (
SELECT
    EC.Employee_id_fk AS employee$id
    , ISNULL(E.[name],'') AS employee$name, ISNULL(E.Surname1,'') AS employee$surname1, ISNULL(E.Surname2,'') AS employee$surname2
        , TRIM(ISNULL(E.Surname1,'') + ' ' +  ISNULL(E.Surname2,'') + CASE WHEN E.[name] IS NULL THEN '' ELSE ', ' + E.[name] END) AS employee$fullName
    , EC.InitialDate AS employee$startsOn, EC.EndDate AS employee$endsOn
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
	SELECT Center_id_pk AS employee$center$id,CenterCode AS employee$center$code,[Name] AS employee$center$name FROM Centers
) AS C ON C.employee$center$id = EC.Center_id_fk
INNER JOIN (
    SELECT
         Department_id_pk AS employee$department$id,[Name] AS employee$department$name
		 ,ISNULL([Type],99) AS employee$department$type,Locked AS employee$department$locked
     FROM Departments
) AS D ON D.employee$department$id = EC.Department_id_fk
) AS E ON E.employee$id = M.Employee_id_fk
`;