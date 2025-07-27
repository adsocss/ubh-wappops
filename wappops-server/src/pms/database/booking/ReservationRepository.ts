import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { IReservation } from "./IReservation";

export class ReservationRepository extends AbstractRepository<IReservation, number> {
    protected map(row: any): IReservation {
        return {
            id: row.id,
            numberSeries: row.numberSeries,
            number: row.number,
            roomIndex: row.roomIndex,
            locator: row.locator,
            status: row.status,
            arrival: row.arrival,
            departure: row.departure,
            holder: row.holder,
            adults: row.adults,
            juniors: row.juniors,
            children: row.children,
            babies: row.babies,
            center: {
                id: row.center$id,
                code: row.center$code,
                name: row.center$name,
            },
            ttoo: {
                code: row.ttoo$code,
                name: row.ttoo$name,
            },
            agency: {
                code: row.agency$code,
                name: row.agency$name,
            },
            roomId: row.roomId,
        } as IReservation;
    }

    protected getQuery(): string {
        return QUERY;
    }
}

const QUERY = `
SELECT
	*
    , center$id AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
FROM (
SELECT
	Reservation_id_pk AS id,[Year] AS numberSeries,Number AS number, Desglose AS roomIndex
	,ArrivalDate AS arrival, ExitDate AS departure
	,Responsible AS holder, AD AS adults, JR AS juniors, CH AS children, BB AS babies
	,C.Center_id_pk AS center$id, C.CenterCode AS center$code, C.[Name] AS center$name
	,TTOO.Code AS ttoo$code, TTOO.[Name] AS ttoo$name , AG.Code AS agency$code, AG.[Name] AS agency$name
	,R.Reference AS locator
	,CASE WHEN RsvStatus_id_fk = 0 THEN 'new'
		  WHEN RsvStatus_id_fk = 1 THEN 'confirmed'
		  WHEN RsvStatus_id_fk = 2 THEN 'check-in'
		  WHEN RsvStatus_id_fk = 3 THEN 'check-out'
          WHEN RsvStatus_id_fk = 5 THEN 'no-show'
	END [status]
	,Room_id_fk AS roomId
	,Reservation_id_pk AS primary_key
FROM Reservations AS R
INNER JOIN Centers AS C ON C.Center_id_pk = r.Center_id_fk
INNER JOIN ClientComposition AS CC ON CC.ClientComposition_id_pk = R.ClientComposition_id_fk
INNER JOIN TTOO_Agency AS TTOO ON TTOO.TTOO_Agency_id_pk = CC.TTOO_id_fk
INNER JOIN TTOO_Agency AS AG ON AG.TTOO_Agency_id_pk = CC.Agency_id_fk
WHERE RsvStatus_id_fk IN(0,1,2,3,5) AND Room_id_fk IS NOT NULL
) AS R
WHERE (CONVERT(date, GETDATE()) BETWEEN arrival AND departure )
	  OR (CONVERT(date, DATEADD(day,1,GETDATE())) BETWEEN arrival AND departure )
`;