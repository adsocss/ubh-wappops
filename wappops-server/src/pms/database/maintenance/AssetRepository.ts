import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { IAsset } from "./IAsset";

export class AssetRepository extends AbstractRepository<IAsset, number> {
    protected map(row: AssetRow): IAsset {
        return {
            id: row.id,
            code: row.code,
            reference: row.reference,
            name: row.name,
            retired: row.retired,
            center: {
                id: row.center$id,
                code: row.center$code,
                name: row.center$name
            },
            store: {
                id: row.store$id,
                name: row.store$name
            }
        }
    }

    protected getQuery(): string {
        return QUERY;
    }
}

type AssetRow = {
    id: number
    code: string
    reference: string
    name: string
    retired: boolean
    center$id: number
    center$code: string
    center$name: string
    store$id: number
    store$name: string
}

const QUERY = `
SELECT
    M.STORE_Product_id_fk AS primary_key
    ,C.Center_id_pk AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
    ,M.STORE_Product_id_fk AS id
    ,P.Code AS code
    ,P.Reference AS reference
    ,P.[Name] AS [name]
    ,CASE WHEN STORE_ProductMovementType_id_fk IN(2,3,4) THEN 1 ELSE 0 END AS retired
    ,C.Center_id_pk AS center$id, C.CenterCode AS center$code, C.[Name] AS center$name
    ,S.STORE_Store_id_pk AS store$id
    ,S.[Name] AS store$name
FROM [STORE_ProductMovements] AS M
INNER JOIN Centers AS C ON C.Center_id_pk = M.Center_id_fk
INNER JOIN [STORE_Products] AS P ON P.STORE_Product_id_pk = M.STORE_Product_id_fk
INNER JOIN [STORE_Stores] AS S ON S.STORE_Store_id_pk = M.STORE_Store_id_fk
WHERE FixedAsset = 1
`;