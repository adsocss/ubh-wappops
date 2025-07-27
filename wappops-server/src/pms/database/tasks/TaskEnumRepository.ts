import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { ITaskEnum, TaskEnumType, TaskPriorityCode, TaskStatusCode, TaskTargetCode } from "./ITaskEnum";

export class TaskEnumRepository  extends AbstractRepository<ITaskEnum<any>, number> {
    protected map(row: TaskEnumRow): ITaskEnum<any> {
        return {
            id: row.id,
            type: row.type as TaskEnumType,
            enumValue: row.enumValue,
            order: row.order,
            code: this.getEnumCode(row.type as TaskEnumType, row.code),
            name: row.name,
            isDefault: row.isDefault ? true : false
        }
    }

    protected getQuery(): string {
        return QUERY;
    }

    private getEnumCode(enumType: TaskEnumType, code: string) {
        switch (enumType) {
            case 'status': return code as TaskStatusCode;
            case 'priority': return code as TaskPriorityCode;
            case 'target-type': return code as TaskTargetCode;
            default: return undefined;
        }
    }
}

type TaskEnumRow = {
    id: number
    type: string
    enumValue: number
    order: number
    code: string
    name: string
    isDefault: boolean
}

// NOTA IMPORTANTE: ROW_NUMBER() devuelve un BIGINT en SQL Server, pero lo convertimos a INTEGER 
// para evitar problemas de compatibilidad con TypeScript/Knex, que lo convierten a 'string'. Además,
// en este caso, no es necesario usar un BIGINT, ya que el número de filas no superará el límite
// de un INTEGER.
export const TASK_ENUM_QUERY = `
SELECT
	CAST(ROW_NUMBER() OVER(ORDER BY [type], enumValue) AS INTEGER) AS id
    ,*
FROM (
SELECT 'priority' AS [type], 0 AS enumValue, 0 AS [order], 'low' AS code, 'Baja' AS [name], 1 AS isDefault
UNION ALL SELECT 'priority' AS [type], 1 AS enumValue, 1 AS [order], 'medium' AS code, 'Media' AS [name], 0 AS isDefault
UNION ALL SELECT 'priority' AS [type], 2 AS enumValue, 2 AS [order], 'high' AS code, 'Alta' AS [name], 0 AS isDefault
UNION ALL SELECT 'priority' AS [type], 3 AS enumValue, 3 AS [order], 'urgent' AS code, 'Urgente' AS [name], 0 AS isDefault

UNION ALL SELECT 'status' AS [type], 0 AS enumValue, 0 AS [order], 'pending' AS code, 'Pendiente' AS [name], 1 AS isDefault
UNION ALL SELECT 'status' AS [type], 1 AS enumValue, 1 AS [order], 'active' AS code, 'En curso' AS [name], 0 AS isDefault
UNION ALL SELECT 'status' AS [type], 2 AS enumValue, 2 AS [order], 'closed' AS code, 'Finalizada' AS [name], 0 AS isDefault

UNION ALL SELECT 'target-type' AS [type], 0 AS enumValue, 2 AS [order], 'asset' AS code, 'Activo fijo' AS [name], 0 AS isDefault
UNION ALL SELECT 'target-type' AS [type], 1 AS enumValue, 1 AS [order], 'location' AS code, 'Ubicación / Dependencia' AS [name], 0 AS isDefault
UNION ALL SELECT 'target-type' AS [type], 2 AS enumValue, 0 AS [order], 'room' AS code, 'Habitación' AS [name], 1 AS isDefault
) AS TE
`;

const QUERY = `
SELECT
    id AS primary_key, NULL AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
    ,*
FROM (
    ${TASK_ENUM_QUERY}
) AS TE
`;
