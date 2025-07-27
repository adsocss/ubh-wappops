import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../../../application/auth/AuthConstants";
import type { IUser } from "../../../application/auth/IUser";
import type { ITasksConfiguration } from "../../../application/config/ITasksConfiguration";
import { AbstractRepository } from "../../../application/db/AbstractRepository";
import type { IDatabase } from "../../../application/db/IDatabase";
import type { IResultSetPage } from "../../../application/db/IResulSetPage";
import type { PMSDatabase } from "../../../services/PMSDatabase";
import type { ICenter } from "../centers/ICenter";
import type { ICenterLocation } from "../centers/ICenterLocation";
import type { IRoom } from "../centers/IRoom";
import type { IDepartment } from "../hhrr/IDepartment";
import type { IEmployee } from "../hhrr/IEmployee";
import type { IAsset } from "../maintenance/IAsset";
import type { ITask } from "./ITask";
import type { ITaskEnum, TaskEnumType } from "./ITaskEnum";
import type { ITaskType } from "./ITaskType";
import { TASK_ENUM_QUERY } from "./TaskEnumRepository";

export class TaskRepository extends AbstractRepository<ITask, number> {
    private configuration: ITasksConfiguration | undefined;

    constructor(database: IDatabase, configuration: ITasksConfiguration) {
        super(database);
        this,configuration = configuration;
        this.addCtes(QUERY);
    }

    public override async findAll(user: IUser, page?: IResultSetPage<ITask, number> | undefined): Promise<ITask[]> {
        const tasks = await super.findAll(user, page);
        await this.addDocuments(user, tasks);

        return tasks;
    }

    public override async findById(user: IUser, id: number): Promise<ITask | undefined> {
        const task = await super.findById(user, id);
        if (task) {
            await this.addDocuments(user, [task]);
        }

        return task;
    }

    private async addDocuments(user: IUser, tasks: ITask[]) {
        const ids = tasks.map(t => t.id).filter(id => id !== undefined);
        const documents = await (this.db as PMSDatabase).task_documents.findDocuments(user, ids); 
        tasks.forEach(t => t.documents = documents.filter(d => d.taskId === t.id));
    }

    protected getQuery(): string {
        const closedTasksDaysBefore = this.configuration?.timespan.find(tm => tm.status === 'closed')?.daysBefore ?? 10;

        return `
            SELECT * FROM (
            SELECT * FROM (SELECT *, DATEDIFF(DAY, closedOn, GETDATE()) AS days_since_closed FROM TASK) AS TS
            WHERE status$code IN ('pending','active') OR (status$code = 'closed' AND days_since_closed < ${closedTasksDaysBefore})
            ) AS T
        `;
    }

    protected override getSecurityFilter(user: IUser): string {
        const defaultFilter = super.getSecurityFilter(user);

        return `
            createdByUsername = '${user.username}' OR (${defaultFilter})
        `;
    }

    protected map(row: TaskRow): ITask {
        const commonCenter = this.mapCenter(row, 'center$') as ICenter;
        const targetType = this.mapEnum(row, 'target-type', 'targetType$');
        const target = this.mapTarget(row, commonCenter);
        const taskType = !row.type$id ? undefined as unknown as ITaskType: {
            id: row.type$id,
            name: row.type$name,
            isCleanTask: row.type$isCleanTask ? true : false,
            estimatedWorkTime: row.type$estimatedWorkTime,
            department: this.mapDepartment(row, 'type$department$') as IDepartment
        };

        return {
            id: row.id,
            number: row.number,
            description: row.description,
            status: this.mapEnum(row, 'status', 'status$'),
            priority: this.mapEnum(row, 'priority', 'priority$'),
            locksRoom: row.locksRoom ? true : false,
            lockPlanned: row.lockPlanned ? true : false,
            scheduled: row.scheduled ? true : false,
            insuranceNotified: row.insuranceNotified ? true : false,
            courtesyCallDone: row.courtesyCallDone ? true : false,
            center: commonCenter,
            department: taskType.department,
            taskType: taskType,
            targetType: targetType,
            taskTarget: target,
            createdOn: row.createdOn ?? undefined,
            createdByUsername: row.createdByUsername ?? undefined,
            createdBy: this.mapEmployee(row, 'createdBy$'),
            notifiedOn: row.notifiedOn ?? undefined,
            notifiedBy: this.mapEmployee(row, 'notifiedBy$'),
            reportTo: this.mapEmployee(row, 'reportTo$'),
            assignedTo: this.mapEmployee(row, 'assignedTo$'),
            startedOn: row.startedOn ?? undefined,
            closedOn: row.closedOn ?? undefined,
            workTime: row.workTime ?? undefined,
            documents: [],
            syncStatus: 'synced',
        }
    }

    private mapEnum<T extends TaskEnumType>(row: any, type: T, prefix: string): ITaskEnum<T> {
        return {
            id: row[`${prefix}id`],
            type: type,
            enumValue: row[`${prefix}value`],
            order: row[`${prefix}order`],
            code: row[`${prefix}code`],
            name: row[`${prefix}name`],
            isDefault: row[`${prefix}isDefault`] ? true : false
        }
    }

    private mapCenter(row: any, prefix: string): ICenter | undefined{
        if (!row[`${prefix}id`]) return undefined;

        return {
            id: row[`${prefix}id`],
            code: row[`${prefix}code`],
            name: row[`${prefix}name`]
        }
    }

    private mapDepartment(row: any, prefix: string): IDepartment | undefined {
        if (!row[`${prefix}id`]) return undefined;

        return {
            id: row[`${prefix}id`],
            name: row[`${prefix}name`],
            type: row[`${prefix}type`],
            locked: row[`${prefix}locked`] ? true : false,
        }
    }

    private mapTarget(row: TaskRow, commonCenter: ICenter): IAsset | ICenterLocation | IRoom | undefined {
        if (row.asset$id) {
            const target: IAsset = {
                id: row.asset$id,
                code: row.asset$code,
                reference: row.asset$reference,
                name: row.asset$name,
                retired: row.asset$retired ? true : false,
                store: {
                    id: row.asset$store$id,
                    name: row.asset$store$name
                },
                center: commonCenter
            };

            return target;
        }

        if (row.location$id) {
            const target: ICenterLocation = {
                id: row.location$id,
                code: row.location$code,
                name: row.location$name,
                center: commonCenter
            }

            return target;
        }

        if (row.room$id) {
            const target: IRoom = {
                id: row.room$id,
                number: row.room$number,
                // Mantener para compatibilidad con versiones anteriores
                type: row.room$type,
                typeName: row.room$typeName,

                // Nuevo v0.5.0-beta
                roomType: {
                    id: row.roomType$id,
                    code: row.roomType$code,
                    name: row.roomType$name,
                    detail: row.roomType$detail
                },

                locked: row.room$locked ? true : false,
                clean: row.room$clean ? true : false,
                center: commonCenter,
                block: row.room$block$id ? {
                    id: row.room$block$id,
                    name: row.room$block$name,
                    center: commonCenter
                } : undefined,
                floor: row.room$floor$id ? {
                    id: row.room$floor$id,
                    name: row.room$floor$name,
                    center: commonCenter
                } : undefined,
                range: row.room$range$id ? {
                    id: row.room$range$id,
                    name: row.room$range$name,
                    center: commonCenter
                } : undefined
            };

            return target;
        }

        return undefined;
    }

    private mapEmployee(row: any, prefix: string): IEmployee | undefined {
        if (!row[`${prefix}id`]) return undefined;

        return {
            id: row[`${prefix}id`],
            name: row[`${prefix}name`],
            surname1: row[`${prefix}surname1`],
            surname2: row[`${prefix}surname2`],
            fullName: row[`${prefix}fullName`],
            startsOn: row[`${prefix}startsOn`],
            endsOn: row[`${prefix}endsOn`],
            center: this.mapCenter(row, `${prefix}center$`) as ICenter,
            department: this.mapDepartment(row, `${prefix}department$`) as IDepartment
        }
    }
}

type TaskRow = {
    id: number
    number: number
    description: string
    status$id: number
    status$type: string
    status$code: string
    status$name: string
    status$value: number
    status$order: number
    status$isDefault: boolean
    priority$id: number
    priority$type: string
    priority$code: string
    priority$name: string
    priority$value: number
    priority$order: number
    priority$isDefault: boolean
    locksRoom: boolean
    lockPlanned: boolean
    scheduled: boolean
    insuranceNotified: boolean
    courtesyCallDone: boolean
    center$id: number
    center$code: string
    center$name: string
    type$id: number
    type$name: string
    type$estimatedWorkTime: number
    type$isCleanTask: boolean
    type$department$id: number
    type$department$name: string
    type$department$type: number
    type$department$locked: boolean
    targetType$id: number
    targetType$type: number
    targetType$name: string
    targetType$value: number
    targetType$order: number
    targetType$isDefault: boolean
    asset$id: number
    asset$code: string
    asset$reference: string
    asset$name: string
    asset$retired: boolean
    asset$center$id: number
    asset$center$code: string
    asset$center$name: string
    asset$store$id: number
    asset$store$name: string
    location$id: number
    location$code: string
    location$name: string
    location$center$id: number
    location$center$code: string
    location$center$name: string
    room$id: number
    room$number: string
    // Mantener para compatibilidad con versiones anteriores
    room$type: string
    room$typeName: string
    // Nuevo v0.5.0-beta
    roomType$id: number
    roomType$code: string
    roomType$name: string
    roomType$detail: string

    room$locked: boolean
    room$clean: boolean
    room$center$id: number
    room$center$code: string
    room$center$name: string
    room$block$id: number
    room$block$name: string
    room$block$center$id: number
    room$block$center$code: string
    room$block$center$name: string
    room$floor$id: number
    room$floor$name: string
    room$floor$center$id: number
    room$floor$center$code: string
    room$floor$center$name: string
    room$range$id: number
    room$range$name: string
    room$range$center$id: number
    room$range$center$code: string
    room$range$center$name: string
    createdOn: Date
    createdByUsername: string
    createdBy$id: number
    createdBy$name: string
    createdBy$surname1: string
    createdBy$surname2: string
    createdBy$fullName: string
    createdBy$center$id: number
    createdBy$center$code: string
    createdBy$center$name: string
    createdBy$department$id: number
    createdBy$department$name: string
    createdBy$department$type: number
    createdBy$department$locked: boolean
    notifiedOn: Date
    notifiedBy$id: number
    notifiedBy$name: string
    notifiedBy$surname1: string
    notifiedBy$surname2: string
    notifiedBy$fullName: string
    notifiedBy$center$id: number
    notifiedBy$center$code: string
    notifiedBy$center$name: string
    notifiedBy$department$id: number
    notifiedBy$department$name: string
    notifiedBy$department$type: number
    notifiedBy$department$locked: boolean
    reportTo$id: number
    reportTo$name: string
    reportTo$surname1: string
    reportTo$surname2: string
    reportTo$fullName: string
    reportTo$center$id: number
    reportTo$center$code: string
    reportTo$center$name: string
    reportTo$department$id: number
    reportTo$department$name: string
    reportTo$department$type: number
    reportTo$department$locked: boolean
    startedOn: Date
    closedOn: Date
    assignedTo$id: number
    assignedTo$name: string
    assignedTo$surname1: string
    assignedTo$surname2: string
    assignedTo$fullName: string
    assignedTo$center$id: number
    assignedTo$center$code: string
    assignedTo$center$name: string
    assignedTo$department$id: number
    assignedTo$department$name: string
    assignedTo$department$type: number
    assignedTo$department$locked: boolean
    workTime: number
}

const QUERY = `
WITH TASK_ENUM AS (
${TASK_ENUM_QUERY}
)
, CENTER AS (
    SELECT
        Center_id_pk AS id
        ,CenterCode AS code
        ,[Name] AS [name]
    FROM Centers
    WHERE Center_id_pk > 0
)
, ASSET AS (
SELECT
    M.STORE_Product_id_fk AS asset$id
    ,P.Code AS asset$code
    ,P.Reference AS asset$reference
    ,P.[Name] AS asset$name
    ,CASE WHEN STORE_ProductMovementType_id_fk IN(2,3,4) THEN 1 ELSE 0 END AS asset$retired
    ,C.id AS asset$center$id, C.code AS asset$center$code, C.[name] AS asset$center$name
    ,S.STORE_Store_id_pk AS asset$store$id
    ,S.[Name] AS asset$store$name
FROM [STORE_ProductMovements] AS M
INNER JOIN CENTER AS C ON C.id = M.Center_id_fk
INNER JOIN [STORE_Products] AS P ON P.STORE_Product_id_pk = M.STORE_Product_id_fk
INNER JOIN [STORE_Stores] AS S ON S.STORE_Store_id_pk = M.STORE_Store_id_fk
WHERE FixedAsset = 1
)
, CENTER_LOCATION AS (
SELECT
	CenterZone_id_pk AS location$id, CodZone AS location$code, [Description] AS location$name
	, C.id AS location$center$id, C.code AS location$center$code, C.[name] AS location$center$name
FROM CenterZones AS L
INNER JOIN CENTER AS C ON C.id = L.Center_id_fk
)
, ROOM AS (
SELECT
    R.[Room_id_pk] AS room$id
    ,R.[Number] AS room$number
 
    -- Mantener para compatibilidad con versiones anteriores
    ,RT.[Code] AS room$type
    ,RT.[Description] AS room$typeName

    --- Nuevo v0.5.0-beta
	,RTC.RoomTypeCenter_id_pk AS roomType$id
	,RT.Code AS roomType$code
	,RT.[Description] AS roomType$name
	,RTC.DescriptionDetailed AS roomType$detail

    ,ISNULL(R.[LockedStatus], 0) AS room$locked
    ,ISNULL(R.[CleanStatus], 0) AS room$clean
	,C.Center_id_pk AS room$center$id, C.CenterCode AS room$center$code, C.[Name] AS room$center$name
	,RBL.RoomRange_id_pk AS room$block$id, RBL.RangeDescription AS room$block$name 
	,C.Center_id_pk AS room$block$center$id, C.CenterCode AS room$block$center$code, C.[Name] AS room$block$center$name
	,RFL.RoomRange_id_pk AS room$floor$id, RFL.RangeDescription AS room$floor$name
	,C.Center_id_pk AS room$floor$center$id, C.CenterCode AS room$floor$center$code, C.[Name] AS room$floor$center$name
	,RRA.RoomRange_id_pk AS room$range$id, RBL.RangeDescription AS room$range$name
	,C.Center_id_pk AS room$range$center$id, C.CenterCode AS room$range$center$code, C.[Name] AS room$range$center$name
FROM [Rooms] AS R
INNER JOIN Centers AS C ON C.Center_id_pk = R.Center_id_fk
LEFT JOIN RoomTypesPerCenter AS RTC ON RTC.RoomTypeCenter_id_pk = R.RoomTypeCenter_id_fk
LEFT JOIN RoomTypes AS RT ON RT.RoomType_id_pk = RTC.RoomType_id_fk
LEFT JOIN RoomRanges AS RBL ON RBL.RoomRange_id_pk = R.Block_id_fk 
LEFT JOIN RoomRanges AS RFL ON RFL.RoomRange_id_pk = R.Floor_id_fk
LEFT JOIN RoomRanges AS RRA ON RRA.RoomRange_id_pk = R.RoomRange_id_fk
WHERE R.Virtual = 0 AND RTC.Real = 1 
)
, EMPLOYEE AS (
SELECT
    EC.Employee_id_fk AS id
    , ISNULL(E.[name],'') AS [name], ISNULL(E.Surname1,'') AS surname1, ISNULL(E.Surname2,'') AS surname2
	, TRIM(ISNULL(E.Surname1,'') + ' ' +  ISNULL(E.Surname2,'') + CASE WHEN E.[name] IS NULL THEN '' ELSE ', ' + E.[name] END) AS fullName
    , C.Center_id_pk AS center$id, C.CenterCode AS center$code, C.[Name] AS center$name
      , D.Department_id_pk AS department$id, D.[Name] AS department$name, ISNULL(D.[Type],99) AS department$type, D.Locked AS department$locked
    , EC.InitialDate AS [start_date], EC.EndDate AS end_date
FROM RRHH_EmployeesContracts AS EC
INNER JOIN (
SELECT DISTINCT
    Employee_id_fk AS employee_id
    , FIRST_VALUE(EmployeeContract_id_pk) OVER (PARTITION BY Employee_id_fk ORDER BY EndDate DESC) AS last_contract_id
FROM RRHH_EmployeesContracts
) AS LC ON LC.last_contract_id = EC.EmployeeContract_id_pk
INNER JOIN RRHH_Employees AS E ON E.Employee_id_pk = EC.Employee_id_fk
INNER JOIN Centers AS C ON C.Center_id_pk = EC.Center_id_fk
INNER JOIN Departments AS D ON D.Department_id_pk = EC.Department_id_fk
)
, CREATED_BY_EMPLOYEE AS (
SELECT
	U.UserName AS createdByUsername
	,E.*
FROM aspnet_Users AS U
INNER JOIN [aspnet_Membership] AS M ON M.UserId = U.UserId
INNER JOIN EMPLOYEE AS E ON E.id = M.Employee_id_fk
)
, TASK_TYPE AS (
SELECT
	TaskType_id_pk AS type$id, TT.[Name] AS type$name, ISNULL(WorktimeEstimate,0) AS type$estimatedWorkTime
	,CASE WHEN SUBSTRING(UPPER(TRIM(TT.[Name])),1,3) = '@PL' THEN 1 ELSE 0 END AS type$isCleanTask
	,D.Department_id_pk AS type$department$id, D.[Name] AS type$department$name, ISNULL(D.[Type],99) AS type$department$type,D.Locked AS type$locked
FROM TaskTypes AS TT
INNER JOIN Departments AS D ON D.Department_id_pk = TT.Department_id_fk
)
, TASK AS (
SELECT
    T.Task_id_pk AS primary_key
    ,C.id AS ${CENTER_SECURITY_COLUMN}, TT.type$department$id AS ${DEPARTMENT_SECURITY_COLUMN}
	,T.Task_id_pk AS id, T.TaskNumber AS number, T.[Observations] AS [description]
	,ST.id AS status$id, ST.[type] AS status$type, ST.code AS status$code, ST.[name] AS status$name, ST.[enumValue] AS status$value, ST.[order] AS status$order, ST.isDefault AS status$isDefault
	,PR.id AS priority$id, PR.[type] AS priority$type, PR.code AS priority$code, PR.[name] AS priority$name, PR.[enumValue] AS priority$value, PR.[order] AS priority$order, PR.isDefault AS priority$isDefault
	,T.LockedRoom AS locksRoom, T.BlockPlanned AS lockPlanned, CASE WHEN TaskPlanning_id_fk IS NULL THEN 0 ELSE 1 END AS scheduled
	,T.InsuranceNotified AS insuranceNotified, CASE WHEN ISNULL(T.CourtesyCall,0) = 2 THEN 1 ELSE 0 END AS courtesyCallDone

	,TT.*

	,TRT.id AS targetType$id, TRT.[type] AS targetType$type, TRT.code AS targetType$code, TRT.[name] AS targetType$name, TRT.[enumValue] AS targetType$value, TRT.[order] AS targetType$order, TRT.isDefault AS targetType$isDefault
	,A.*, L.*, R.*

	,T.CreationDate AS createdOn
	,COALESCE(ECB.createdByUsername, T.CreationUser) AS createdByUsername
	,ECB.id AS createdBy$id, ECB.[name] AS createdBy$name, ECB.surname1 AS createdBy$surname1, ECB.surname2 AS createdBy$surname2, ECB.fullName AS createdBy$fullName
	,ECB.center$id AS createdBy$center$id, ECB.center$code AS createdBy$center$code, ECB.center$name AS createdBy$center$name
	,ECB.department$id AS createdBy$department$id, ECB.department$name AS createdBy$department$name, ECB.department$type AS createdBy$department$type, ECB.department$locked AS createdBy$department$locked

	,T.DateCommunication AS notifiedOn
	,ENB.id AS notifiedBy$id, ENB.[name] AS notifiedBy$name, ENB.surname1 AS notifiedBy$surname1, ENB.surname2 AS notifiedBy$surname2, ENB.fullName AS notifiedBy$fullName
	,ENB.center$id AS notifiedBy$center$id, ENB.center$code AS notifiedBy$center$code, ENB.center$name AS notifiedBy$center$name
	,ENB.department$id AS notifiedBy$department$id, ENB.department$name AS notifiedBy$department$name, ENB.department$type AS notifiedBy$department$type, ENB.department$locked AS notifiedBy$department$locked

	,ERT.id AS reportTo$id, ERT.[name] AS reportTo$name, ERT.surname1 AS reportTo$surname1, ERT.surname2 AS reportTo$surname2, ERT.fullName AS reportTo$fullName
	,ERT.center$id AS reportTo$center$id, ERT.center$code AS reportTo$center$code, ERT.center$name AS reportTo$center$name
	,ERT.department$id AS reportTo$department$id, ERT.department$name AS reportTo$department$name, ERT.department$type AS reportTo$department$type, ERT.department$locked AS reportTo$department$locked

	,T.DateStartingTask AS startedOn, T.DateEndingTask AS closedOn
	,EAT.id AS assignedTo$id, EAT.[name] AS assignedTo$name, EAT.surname1 AS assignedTo$surname1, EAT.surname2 AS assignedTo$surname2, EAT.fullName AS assignedTo$fullName
	,EAT.center$id AS assignedTo$center$id, EAT.center$code AS assignedTo$center$code, EAT.center$name AS assignedTo$center$name
	,EAT.department$id AS assignedTo$department$id, EAT.department$name AS assignedTo$department$name, EAT.department$type AS assignedTo$department$type, EAT.department$locked AS assignedTo$department$locked

	,ISNULL(T.WorktimeEstimate,0) AS workTime

	,C.id AS center$id, C.code AS center$code, C.[name] AS center$name
FROM (
SELECT
	*
	,CASE WHEN STORE_Product_id_fk IS NOT NULL THEN 0
		  WHEN CenterZone_id_fk IS NOT NULL THEN 1
		  WHEN Room_id_fk IS NOT NULL THEN 2
	END AS target_enum_value
FROM TaskHeader
) AS T
INNER JOIN CENTER AS C ON C.id = T.Center_id_fk
INNER JOIN TASK_ENUM AS ST ON ST.[type] = 'status' AND ST.[enumValue] = T.TaskStatus
INNER JOIN TASK_ENUM AS PR ON PR.[type] = 'priority' AND PR.[enumValue] = T.[Priority]
INNER JOIN TASK_TYPE AS TT ON TT.type$id = t.TaskType_id_fk
LEFT JOIN TASK_ENUM AS TRT ON TRT.[type] = 'target-type' AND TRT.[enumValue] = T.target_enum_value
LEFT JOIN ASSET AS A ON A.asset$id = T.STORE_Product_id_fk
LEFT JOIN CENTER_LOCATION AS L ON L.location$id = T.CenterZone_id_fk
LEFT JOIN ROOM AS R ON R.room$id = T.Room_id_fk
LEFT JOIN EMPLOYEE AS ENB ON ENB.id = T.EmployeeInformed_id_fk 
LEFT JOIN EMPLOYEE AS ERT ON ERT.id = T.EmployeeNoticed_id_fk
LEFT JOIN EMPLOYEE AS EAT ON EAT.id = T.EmployeeRepaired_id_fk
LEFT JOIN CREATED_BY_EMPLOYEE AS ECB ON ECB.createdByUsername = T.CreationUser
)
`;