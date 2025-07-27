import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { ICenter } from "./ICenter";
import type { IRoom } from "./IRoom";

export class RoomRepository extends AbstractRepository<IRoom, number> {
    protected map(row: RoomRow): IRoom {
        const center: ICenter = {
            id: row.center$id,
            code: row.center$code,
            name: row.center$name
        }

        return {
            id: row.id,
            number: row.number,
            type: row.type,
            typeName: row.typeName,
            roomType: {
                id: row.roomType$id,
                code: row.roomType$code,
                name: row.roomType$name,
                detail: row.roomType$detail
            },
            locked: row.locked,
            clean: row.clean,
            center: center,
            block: !row.block$id ? undefined : {
                id: row.block$id,
                name: row.block$name,
                center: center
            },
            floor: !row.floor$id ? undefined : {
                id: row.floor$id,
                name: row.floor$name,
                center: center
            },
            range: !row.range$id ? undefined : {
                id: row.range$id,
                name: row.range$name,
                center: center
            }, 
            syncStatus: 'synced'
        }
    }

    protected getQuery(): string {
        return QUERY;
    }
}

type RoomRow = {
    id: number
    number: string
    // Mantener para compatibilidad con versiones anteriores
    type: string
    typeName: string

    // Nuevo v0.5.0-beta
	roomType$id: number
	roomType$code: string
	roomType$name: string
	roomType$detail: string

    locked: boolean
    clean: boolean
    center$id: number
    center$code: string
    center$name: string
    block$id: number
    block$name: string
    floor$id: number
    floor$name: string
    range$id: number
    range$name: string
}

const QUERY = `
SELECT
    R.[Room_id_pk] AS primary_key
    ,C.Center_id_pk AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
    ,R.[Room_id_pk] AS id
    ,R.[Number] AS number
    
    --- Mantener para compatibilidad con versiones anteriores
    ,RT.[Code] AS [type]
    ,RT.[Description] AS typeName

    --- Nuevo v0.5.0-beta
	,RTC.RoomTypeCenter_id_pk AS roomType$id
	,RT.Code AS roomType$code
	,RT.[Description] AS roomType$name
	,RTC.DescriptionDetailed AS roomType$detail

    ,ISNULL(R.[LockedStatus], 0) AS locked
    ,ISNULL(R.[CleanStatus], 0) AS clean
	,C.Center_id_pk AS center$id, C.CenterCode AS center$code, C.[Name] AS center$name
	,RBL.RoomRange_id_pk AS block$id, RBL.RangeDescription AS block$name 
	,RFL.RoomRange_id_pk AS floor$id, RFL.RangeDescription AS floor$name
	,RRA.RoomRange_id_pk AS range$id, RRA.RangeDescription AS range$name
FROM [Rooms] AS R
INNER JOIN Centers AS C ON C.Center_id_pk = R.Center_id_fk
LEFT JOIN RoomTypesPerCenter AS RTC ON RTC.RoomTypeCenter_id_pk = R.RoomTypeCenter_id_fk
LEFT JOIN RoomTypes AS RT ON RT.RoomType_id_pk = RTC.RoomType_id_fk
LEFT JOIN RoomRanges AS RBL ON RBL.RoomRange_id_pk = R.Block_id_fk 
LEFT JOIN RoomRanges AS RFL ON RFL.RoomRange_id_pk = R.Floor_id_fk
LEFT JOIN RoomRanges AS RRA ON RRA.RoomRange_id_pk = R.RoomRange_id_fk
WHERE R.Virtual = 0 AND RTC.Real = 1 
`;