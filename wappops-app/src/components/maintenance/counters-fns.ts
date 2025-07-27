import { ICounterRecord, IResourceCounter } from "@model/data-model";
import { Wappops } from "../../application/wappops";
import { CountersListItem } from "./ubh-counters-list";
import { remapCountersRecord } from "../../application/services/synchronizer";


/**
 * Devuelve una lista de elementos de contadores con sus registros asociados.
 * @param { Wappops } ctx - Contexto de la aplicación.
 * @returns { Promise<CountersListItem[]> } - Lista de elementos de contadores.
 */
export async function getCountersListItems(ctx: Wappops): Promise<CountersListItem[]> {
    const counters = await ctx.db.counters.toArray();
    return Promise.all(counters.map(async (counter) => {
        return getCounterListItem(ctx, counter as IResourceCounter)
    }));
}

/**
 * Devuelve un elemento de contador con sus registros asociados.
 * @param { Wappops } ctx - Contexto de la aplicación.
 * @param { IResourceCounter } counter - Contador
 * @returns { Promise<CountersListItem> } - Elemento de contador con registros.
 */
export async function getCounterListItem(ctx: Wappops, counter: IResourceCounter): Promise<CountersListItem> {
    const records = await ctx.db.countersRecords
        .filter((record) => record.counter.id === counter.id)
        .toArray();

    return {
        counter,
        records
    };    
}

/**
 * Guarda una lectura de contador en la base de datos local y la sincroniza con el servidor.
 * @param { WappOps } ctx - Contexto de la aplicación.
 * @param { ICounterRecord } record - Registro del contador a guardar.
 * @returns { ICounterRecord } - El registro del contador guardado.
 */
export async function saveRecord(ctx: Wappops, record: ICounterRecord): Promise<ICounterRecord> {
    // Validar antes de gueardar
    const parent = await getCounterListItem(ctx, record.counter);
    const lastRecord = parent.records.length > 0 ? parent.records[parent.records.length - 1] : undefined;
    validateCounterRecord(record, lastRecord);

    record.syncStatus = 'pending';
    if (record.localId) {
        await ctx.db.countersRecords.update(record.localId, record);
    } else {
        record.localId = await ctx.db.countersRecords.add(record);
    }

    if (navigator.onLine) {
        let sentCounterRecord = await ctx.api.sendCounterRecord(record);
        sentCounterRecord = remapCountersRecord(sentCounterRecord);
        record.syncStatus = 'synced';
        await ctx.db.countersRecords.update(record.localId, sentCounterRecord);
        return sentCounterRecord;
    }

    return record;
}

/**
 * Valida un registro de contador para asegurarse de que la lectura es correcta en relación con el último registro.
 * @param { ICounterRecord } record - Registro del contador a validar.
 * @param { ICounterRecord | undefined } lastRecord - Último registro del contador, si existe.
 * @throws { Error } Si la lectura del contador es incorrecta.
 */
export function validateCounterRecord(record: ICounterRecord, lastRecord: ICounterRecord | undefined) {
    if (lastRecord && !record.reset) {
        if (record.counter.incremental) {
            if (record.value < lastRecord.value) {
                throw new Error("La lectura del contador no puede ser menor que la última.");
            }
        } else {
            if (record.value > lastRecord.value) {
                throw new Error("La lectura del contador no puede ser mayor que la última.");
            }
        }
    }

    return true;
}