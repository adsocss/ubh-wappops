import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import type { ICountersConfiguration } from "../../../application/config/ICountersConfiguration";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { IDatabase } from "../../../application/db/IDatabase";
import type { ICounterRecord } from "./ICounterRecord";

export class CounterRecordRepository extends AbstractRepository<ICounterRecord, number> {
    private configuration: ICountersConfiguration;

    constructor(database: IDatabase, configuration: ICountersConfiguration) {
        super(database);
        this.configuration = configuration;
    }

    protected map(row: RecordRow): ICounterRecord {
        return {
            id: row.id,
            date: row.date,
            value: row.value,
            isConsumption: row.isConsumption ? true : false,
            reset: row.isConsumption ? false : true,
            remarks: row.remarks,
            counter: {
                id: row.counter$id,
                name: row.counter$name,
                unitOfMeasure: row.counter$unitOfMeasure,
                incremental: row.counter$incremental ? true : false,
                center: {
                    id: row.counter$center$id,
                    code: row.counter$center$code,
                    name: row.counter$center$name
                }
            },
            syncStatus: 'synced',
        }
    }

    protected getQuery(): string {
        return `${QUERY} WHERE record_number <= ${this.configuration?.recordsPerCounter ?? 10}`;
    }
}

type RecordRow = {
    id: number
    date: Date
    value: number
    isConsumption: boolean
    remarks: string
    counter$id: number
    counter$name: string
    counter$unitOfMeasure: string
    counter$incremental: boolean
    counter$center$id: number
    counter$center$code: string
    counter$center$name: string
};

const QUERY = `
SELECT
	RCR.id AS primary_key
    ,RC.center$id AS ${CENTER_SECURITY_COLUMN}, NULL AS ${DEPARTMENT_SECURITY_COLUMN}
    ,RCR.id
    ,RCR.[date]
    ,RCR.[value]
    ,RCR.isConsumption
    ,RCR.remarks
    ,RC.id AS counter$id, RC.[name] AS counter$name, RC.unitOfMeasure AS counter$unitOfMeasure, RC.incremental AS counter$incremental
	,RC.center$id AS counter$center$id, RC.center$code AS counter$center$code, RC.center$name AS counter$center$name
    ,record_number
FROM (
SELECT
    ROW_NUMBER() OVER (PARTITION BY ResourceCounter_id_fk ORDER BY RegisterDate DESC) AS record_number
    ,ResourceCounter_id_fk 
    ,ResourceCounterReading_id_pk AS id
    ,RegisterDate AS [date]
    ,Measure AS [value]
   	,ISNULL(Observations,'') AS remarks
    ,CASE WHEN NotConsumption = 0 THEN 1 ELSE 0 END AS isConsumption
FROM ResourceCounterReadings AS RCR
) AS RCR
INNER JOIN (
SELECT
    ResourceCounter_id_pk AS id
    ,Description AS [name]
    ,MeasureUnit AS unitOfMeasure
    ,CASE WHEN RC.[Type] = 1 THEN 1 ELSE 0 END AS incremental
    ,C.Center_id_pk AS center$id, CenterCode AS center$code, C.[Name] AS center$name
FROM ResourceCounters AS RC
INNER JOIN Centers AS C ON C.Center_id_pk = RC.Center_id_fk
) RC ON RC.id = RCR.ResourceCounter_id_fk
`;