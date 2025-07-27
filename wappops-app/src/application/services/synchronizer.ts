import type { ICounterRecord, IReservation, IResultSetPage, ITask, ModelEntity } from "@model/data-model";
import Dexie from "dexie";
import { Wappops } from "../wappops";

// Eventos  de sincronización
export const EVT_SYNC_STARTED = 'ubh-sync-started';
export const EVT_SYNC_FINISHED = 'ubh-sync-finished';


/* Intervalo de actualización de la información pendiente de envío al servidor */
const UPDATE_PENDING_INTERVAL = 60 * 1000;

type MapperType<T extends ModelEntity> = (entity: T) => T;
type APICallType<T extends ModelEntity> = (page: IResultSetPage<T, number>) => Promise<T[]>;

export default class WOSynchronizer {
    private ctx: Wappops;
    private _active = false;
    private _updateTask: any = undefined;
    private _lastUpdateTaskExecution: Date | undefined = undefined;


    /**
     * Constructor
     * @param { Wappops } ctx - Contexto de la aplicación.
     */
    constructor(ctx: Wappops) {
        this.ctx = ctx;
    }

    /**
     * Determina si alguno de los procesos de sincronización está activo.
     */
    public get active() {
        return this._active;
    }

    /**
     * Devuelve la última fecha y hora de ejecución de la tarea periódica de actualización.
     */
    public get lastUpdateTaskExecution() {
        return this._lastUpdateTaskExecution;
    }

    /**
     * Iniciar tarea periódica de sincronización de datos pendientes.
     */
    public startPeriodicTask() {
        if (this._updateTask) {
            return; // Ya está en ejecución
        }

        this._updateTask = setInterval(() =>
            this.syncPending(true, true)
                .then(() => this._lastUpdateTaskExecution = new Date())
            , UPDATE_PENDING_INTERVAL);
    }

    /**
     * Parar tarea periódica de sincronización de datos pendientes.
     */
    public stopPeriodicTask() {
        if (this._updateTask) {
            clearInterval(this._updateTask);
            this._updateTask = undefined;
        }
    }

    /**
     * Sincronización completa de datos con el servidor.
     * 
     * Si no existe conexión de red, aborta silenciosamente la operación.
     * Comienza por sincronizar los datos pendientes y si no hay errores
     * continúa con la descarga de las tablas del servidor.
     * 
     * @param { boolean } silent - Indica si se debe lanzar una excepción en caso de error
     *                     (silent = false). Valor por defecto: false.
     */
    public async syncAll(silent: boolean = false) {
        // Abortar si no hay conexión de red.
        if (!navigator.onLine) {
            return;
        }

        document.dispatchEvent(new CustomEvent(EVT_SYNC_STARTED))
        this.stopPeriodicTask();

        this.syncPending(false, silent)
            .then(() => this.syncTables(silent))
            .catch((error) => {
                if (!silent) {
                    throw error;
                }
            })
            .finally(() => {
                this.startPeriodicTask();
                document.dispatchEvent(new CustomEvent(EVT_SYNC_FINISHED));
            });
        ;
    }

    /**
     * Envía al servidor la información creada o modificada.
     * Si no existe conexión de red, aborta silenciosamente la operación.
     * @param  { boolean } isPeriodicTask - Indica si la llamada se realiza desde la tarea periódica.
     * @param  { boolean } silent - Indica si se debe lanzar una excepción en caso de error
     *                     (silent = false). Valor por defecto: false.
     */
    public async syncPending(isPeriodicTask: boolean, silent: boolean = false) {
        // Abortar si no hay conexión de red.
        if (!navigator.onLine) {
            return;
        }

        if (!isPeriodicTask) {
            this.stopPeriodicTask();
        }

        try {

            this._active = true;

            // Sincronizar datos pendientes
            const pendingTasks = await this.ctx.db.getPendingTasks();
            for (const task of pendingTasks) {
                const sentTask = await this.ctx.api.sendTask(task);
                if (sentTask) {
                    this.ctx.db.tasks.update(task.localId, sentTask);
                }
            }

            const pendingCountersRecords = await this.ctx.db.getPendingCountersRecords();
            for (const record of pendingCountersRecords) {
                const sentRecord = await this.ctx.api.sendCounterRecord(record);
                this.ctx.db.countersRecords.update(record.localId, sentRecord);
            }

            const pendingRoomsStatus = await this.ctx.db.getPendingRoomsStatus();
            for (const room of pendingRoomsStatus) {
                await this.ctx.api.sendRoomStatus(room);
                this.ctx.db.rooms.update(room.id, { syncStatus: 'synced' });
            }

        } catch (error) {
            if (!silent) {
                throw error;
            }
        } finally {
            this._active = false;
            if (!isPeriodicTask) {
                this.startPeriodicTask()
            }
        }
    }

    /**
     * Sincroniza las tablas de la BD local con los datos del servidor.
     * Si no existe conexión de red, aborta silenciosamente la operación.
     * @param  { boolean } silent - Indica si se debe lanzar una excepción en caso de error
     *                     (silent = false). Valor por defecto: false.
     */
    public async syncTables(silent: boolean = false) {
        // Abortar si no hay conexión de red.
        if (!navigator.onLine) {
            return;
        }

        this._active = true;

        try {

            await Promise.all([
                this.syncTable(this.ctx.api.fetchCenters.bind(this.ctx.api), this.ctx.db.centers),
                this.syncTable(this.ctx.api.fetchCentersBlocks.bind(this.ctx.api), this.ctx.db.blocks),
                this.syncTable(this.ctx.api.fetchFloors.bind(this.ctx.api), this.ctx.db.floors),
                this.syncTable(this.ctx.api.fetchLocations.bind(this.ctx.api), this.ctx.db.locations),
                this.syncTable(this.ctx.api.fetchRooms.bind(this.ctx.api), this.ctx.db.rooms),

                this.syncTable(this.ctx.api.fetchDepartments.bind(this.ctx.api), this.ctx.db.departments),
                this.syncTable(this.ctx.api.fetchEmployees.bind(this.ctx.api), this.ctx.db.employees),

                this.syncTable(this.ctx.api.fetchRoomRanges.bind(this.ctx.api), this.ctx.db.roomsRanges),

                this.syncTable(this.ctx.api.fetchAssets.bind(this.ctx.api), this.ctx.db.assets),
                this.syncTable(this.ctx.api.fetchCounters.bind(this.ctx.api), this.ctx.db.counters),
                // this.syncTable(this.ctx.api.fetchCountersRecords.bind(this.ctx.api), this.ctx.db.countersRecords, remapCountersRecord),

                this.syncTable(this.ctx.api.fetchTaskEnums.bind(this.ctx.api), this.ctx.db.tasksEnums),
                this.syncTable(this.ctx.api.fetchTaskTypes.bind(this.ctx.api), this.ctx.db.tasksTypes),
                this.syncTable(this.ctx.api.fetchWorkTimes.bind(this.ctx.api), this.ctx.db.workTimes),
                // this.syncTable(this.ctx.api.fetchTasks.bind(this.ctx.api), this.ctx.db.tasks, remapTask),

                this.syncTable(this.ctx.api.fetchBooking.bind(this.ctx.api), this.ctx.db.booking, remapReservation),

                this.syncCountersRecords(), // Sincronización específica de registros de contadores
                this.syncTasks() // Sincronización específica de tareas
            ]);

            this.ctx.lastSync = new Date();

        } catch (error) {
            if (!silent) {
                console.log(error)
                throw error;
            }
        } finally {
            this._active = false;
        }
    }

    /**
     * Método genérico de sincronización de tabla.
     * @param { APICallType} apiCall - Método del cliente de la API a usar en la petición al servidor.
     * @param { Dexie.Table<T>} table - Tabla de la BD local a sincronizar.
     * @param { MapperType<T>} mapper - Función opcional de mapeado.
     */
    private async syncTable<T extends ModelEntity>(
        apiCall: APICallType<T>,
        table: Dexie.Table<T>,
        mapper: MapperType<T> | undefined = undefined
    ) {

        // Primera página de datos.
        let page: IResultSetPage<T, number> = {
            cursor: 0,
            rows: 200,
            sort: []
        };

        // Limpiar tabla
        // await table.db.transaction('rw', table, async () => await table.clear());
        await table.clear();

        // Descargar y actualizar hasta recibir un array vacío (no hay más datos).
        do {
            const result = ((await apiCall(page)) ?? []).map(e => mapper ? mapper(e) : e);
            if (result.length === 0) {
                break;
            }

            await table.db.transaction('rw', table, async () => await table.bulkPut(result))
            page.cursor = result[result.length - 1].id as number
        } while (true);
    }

    /* Método específico de sincronización para las tareas */
    private async syncTasks() {
        await this.ctx.db.tasks.clear();

        // Primera página de datos.
        let page: IResultSetPage<ITask, number> = {
            cursor: 0,
            rows: 200,
            sort: []
        };

        // Descargar y actualizar hasta recibir un array vacío (no hay más datos).
        do {
            const result = (await this.ctx.api.fetchTasks(page)) ?? [];
            if (result.length === 0) {
                break;
            }               
            // Remapear las tareas
            const remappedTasks = result.map(task => remapTask(task));      

            // Insertar o actualizar las tareas en la BD local
            for(const task of remappedTasks) {
                const existingTask = await this.ctx.db.tasks.get({ id: task.id });
                if (existingTask) {
                    // Actualizar tarea existente
                    await this.ctx.db.tasks.update(existingTask.localId, task);
                }
                else {
                    // Insertar nueva tarea
                    await this.ctx.db.tasks.add(task);
                }
            }

            page.cursor = remappedTasks[remappedTasks.length - 1].id as number;

        } while (true);
    }

    /* Método específico de sincronización de lecturas de contadores */
    private async syncCountersRecords() {
        await this.ctx.db.countersRecords.clear();

        // Primera página de datos.
        let page: IResultSetPage<ICounterRecord, number> = {
            cursor: 0,
            rows: 200,
            sort: []
        };

        // Descargar y actualizar hasta recibir un array vacío (no hay más datos).
        do {
            const result = (await this.ctx.api.fetchCountersRecords(page)) ?? [];
            if (result.length === 0) {
                break;
            }

            // Remapear los registros de contadores
            const remappedRecords = result.map(record => remapCountersRecord(record));

            // Insertar o actualizar los registros en la BD local
            for(const record of remappedRecords) {
                const existingRecord = await this.ctx.db.countersRecords.get({ id: record.id });
                if (existingRecord) {
                    // Actualizar registro existente
                    await this.ctx.db.countersRecords.update(existingRecord.localId, record);
                }
                else {
                    // Insertar nuevo registro
                    await this.ctx.db.countersRecords.add(record);
                }
            }

            page.cursor = remappedRecords[remappedRecords.length - 1].id as number;

        } while (true);
    }
}


/******************************************************************************
 * FUNCIONES AUXILIARES DE MAPEO DE ENTIDADES
 ******************************************************************************/

/**
 * Convierte los campos de fecha de una tarea determinada de 'string' (así se
 * reciben de la API) a 'Date' (así se almacenan en la BD local.)
 * @param { Task} task - Tarea
 * @returns { Task } - Tarea.
 */
export function remapTask(task: ITask): ITask {
    task.createdOn = parseDate(task.createdOn ?? undefined) as Date;
    task.notifiedOn = parseDate(task.notifiedOn ?? undefined);
    task.startedOn = parseDate(task.startedOn ?? undefined);
    task.closedOn = parseDate(task.closedOn ?? undefined);

    return task;
}

/**
 * Convierte los campos de fecha de una reserva determinada de 'string' (así se
 * reciben de la API) a 'Date' (así se almacenan en la BD local.)
 * @param { IReservation} reservation - Reserva
 * @returns { IReservation } - Reserva.
 */
export function remapReservation(reservation: IReservation): IReservation {
    reservation.arrival = parseDate(reservation.arrival) as Date;
    reservation.departure = parseDate(reservation.departure) as Date;

    return reservation;
}

/**
 * Convierte los campos de fecha de un registro de contador determinado de 'string' (así se
 * reciben de la API) a 'Date' (así se almacenan en la BD local.)
 * @param { ICounterRecord} record - Registro de contador.
 * @returns { ICounterRecord } - Registro de contador.
 */
export function remapCountersRecord(record: ICounterRecord): ICounterRecord {
    record.date = parseDate(record.date) as Date;

    return record;
}

/**
 * Conversión de campo de fecha.
 */
function parseDate(date: Date | string | undefined) {
    if (date === undefined) {
        return undefined;
    }

    if (date instanceof Date) {
        return date;
    }

    if (typeof date === 'string') {
        const p = date.split(/\D/);
        const year = parseInt(p[0]);
        const month = parseInt(p[1]) - 1;
        const day = parseInt(p[2]);
        const hour = parseInt(p[3]);
        const minute = parseInt(p[4]);
        const second = parseInt(p[5]);

        return new Date(year, month, day, hour, minute, second);
    }

    return undefined;
}