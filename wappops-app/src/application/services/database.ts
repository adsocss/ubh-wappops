import Dexie from "dexie";
import type {
    IAsset, ICenter, ICenterBlock, ICenterLocation, IResourceCounter, ICounterRecord,
    IDepartment, IEmployee, IFloor, IRoom, IRoomRange, ITask, ITaskEnum, ITaskType, IWorkTime,
    IReservation
    } from "@model/data-model";
import { INotification } from "../../../../wappops-server/src/model/data-model";


export class WODatabase extends Dexie {
    public readonly centers!: Dexie.Table<ICenter>
    public readonly blocks!: Dexie.Table<ICenterBlock>
    public readonly floors!: Dexie.Table<IFloor>
    public readonly locations!: Dexie.Table<ICenterLocation>
    public readonly rooms!: Dexie.Table<IRoom>

    public readonly departments!: Dexie.Table<IDepartment>
    public readonly employees!: Dexie.Table<IEmployee>

    public readonly roomsRanges!: Dexie.Table<IRoomRange>

    public readonly assets!: Dexie.Table<IAsset>
    public readonly counters!: Dexie.Table<IResourceCounter>
    public readonly countersRecords!: Dexie.Table<ICounterRecord>

    public readonly tasksTypes!: Dexie.Table<ITaskType>
    public readonly tasksEnums!: Dexie.Table<ITaskEnum<any>>
    public readonly workTimes!: Dexie.Table<IWorkTime> 
    public readonly tasks!: Dexie.Table<ITask>

    public readonly booking!: Dexie.Table<IReservation>
    public readonly notifications!: Dexie.Table<INotification>

    constructor(dbVersion: number = 2) {
        super('wappops-db');

        this.version(dbVersion).stores({
            centers: 'id, code',
            blocks: 'id',
            floors: 'id',
            locations: 'id',
            rooms: 'id, number',
            departments: 'id',
            employees: 'id, surname1',
            roomsRanges: 'id',
            assets: 'id',
            counters: 'id',
            countersRecords: '++localId, id, date',
            tasksTypes: 'id',
            tasksEnums: 'id, enumValue',
            tasks: '++localId, id, number',
            workTimes: 'id, [taskTypeId+roomTypeId]',
            booking: 'id, roomId',
            notifications: 'id, timestamp'
        });
    }

    /**
     * Devuelve las tareas pendientes de sincronización.
     * @returns { Promise<ITask[]> } - Lista de tareas pendientes.
     */
    public async getPendingTasks(): Promise<ITask[]> {
        return this.tasks.filter(t => t.syncStatus === 'pending').toArray();
    }

    /**
     * Devuelve las lecturas de contadores pendientes de sincronización.
     * @returns { Promise<ICounterRecord[]> } - Lista de lecturas pendientes.
     */
    public async getPendingCountersRecords(): Promise<ICounterRecord[]> {
        return this.countersRecords.filter(r => r.syncStatus === 'pending').toArray();
    }

    /**
     * Devuelve las habitaciones pendientes de sincronización de su
     * estado de limpieza.
     * @returns { Promise<IRoom[]> } - Lista de habitaciones pendientes.
     */
    public async getPendingRoomsStatus(): Promise<IRoom[]> {
        return this.rooms.filter(r => r.syncStatus === 'pending').toArray();
    }

    /**
     * Devuelve el número de entidades pendientes de sincronización.
     * @returns { Promise<number> } - Número pendiente.
     */
    public async getPendingCount(): Promise<number> {
        const tasks = await this.getPendingTasks();
        const countersRecords = await this.getPendingCountersRecords();
        const roomsStatus = await this.getPendingRoomsStatus();

        return tasks.length + countersRecords.length + roomsStatus.length;
    }
}