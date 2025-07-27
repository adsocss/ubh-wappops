import type { Server } from "bun";
import { APIException } from "../../pms/api/APIException";
import type { IRoom } from "../../pms/database/centers/IRoom";
import type { ICounterRecord } from "../../pms/database/maintenance/ICounterRecord";
import type { ITaskDocument } from "../../pms/database/tasks/ITaskDocument";
import { createRequestLogRecord } from "../../services/logger";
import type { IRepository } from "../db/IRepository";
import type { IResultSetPage, ISortColumn } from "../db/IResulSetPage";
import { getRequestUser } from "./auth-handlers";
import type { IApiContext } from "./IApiContext";
import type { ICounterRecordResponse } from "../../pms/api/counters/IGCounterRecord";

// ------------------------------------------------------------------------------------------------
// CENTROS
// ------------------------------------------------------------------------------------------------

export async function centersHandler(request: Request, server: Server, ctx: IApiContext) {
    return find(request, server, ctx, ctx.services.pmsDatabase.centers);
}

export async function blocksHandler(request: Request, server: Server, ctx: IApiContext) {
    return find(request, server, ctx, ctx.services.pmsDatabase.blocks);
}

export async function floorsHandler(request: Request, server: Server, ctx: IApiContext) {
    return find(request, server, ctx, ctx.services.pmsDatabase.floors);
}

export async function roomsHandler(request: Request, server: Server, ctx: IApiContext) {
    return find(request, server, ctx, ctx.services.pmsDatabase.rooms);
}

export async function locationsHandler(request: Request, server: Server, ctx: IApiContext) {
    return find(request, server, ctx, ctx.services.pmsDatabase.locations);
}

// ------------------------------------------------------------------------------------------------
// RR.HH.
// ------------------------------------------------------------------------------------------------

export async function departmentsHandler(request: Request, server: Server, ctx: IApiContext) {
    return find(request, server, ctx, ctx.services.pmsDatabase.departments);
}

export async function employeesHandler(request: Request, server: Server, ctx: IApiContext) {
    return find(request, server, ctx, ctx.services.pmsDatabase.employees);
}

// ------------------------------------------------------------------------------------------------
// SS.TT.
// ------------------------------------------------------------------------------------------------

export async function assetsHandler(request: Request, server: Server, ctx: IApiContext) {
    return find(request, server, ctx, ctx.services.pmsDatabase.assets);
}

export async function countersHandler(request: Request, server: Server, ctx: IApiContext) {
    return find(request, server, ctx, ctx.services.pmsDatabase.counters);
}

export async function countersRecordsHandler(request: Request, server: Server, ctx: IApiContext) {
    if (request.method === 'POST') {
        const user = await getRequestUser(request, ctx);

        // Registrar petición en el log
        ctx.services.logger.info(createRequestLogRecord(server, request, user?.username));

        const record = await request.json() as ICounterRecord;
        if (!record) {
            return new Response(null, { status: 400 });
        }
        const result = await ctx.services.pmsAPIClient.createCounterRecord(user, record) as ICounterRecordResponse;
        if (!result) {
            return new Response(null, { status: 404 });
        }

        const counterRecord = await ctx.services.pmsDatabase.counters_records.findById(user, result.counterReading_id);
        if (!counterRecord) {
            return new Response(null, { status: 404 });
        }

        return Response.json(counterRecord);
    }

    return find(request, server, ctx, ctx.services.pmsDatabase.counters_records);
}

// ------------------------------------------------------------------------------------------------
// LIMPIEZA HOTEL
// ------------------------------------------------------------------------------------------------

export async function roomRangesHandler(request: Request, server: Server, ctx: IApiContext) {
    return find(request, server, ctx, ctx.services.pmsDatabase.room_ranges);
}

export async function roomStatusHandler(request: Request, server: Server, ctx: IApiContext) {
    const id = parseId(request);
    if (!id) {
        return new Response(null, { status: 400 });
    }

    const user = await getRequestUser(request, ctx);

    // Registrar petición en el log
    ctx.services.logger.info(createRequestLogRecord(server, request, user?.username));

    const room = await request.json() as IRoom;
    if (!room) {
        return new Response(null, { status: 400 });
    }

    const result = await ctx.services.pmsAPIClient.updateRoomStatus(user, room);
    if (!result) {
        return new Response(null, { status: 404 });
    }

    return Response.json(result);
}

// ------------------------------------------------------------------------------------------------
// TAREAS
// ------------------------------------------------------------------------------------------------
export async function taskTypesHandler(request: Request, server: Server, ctx: IApiContext) {
    return find(request, server, ctx, ctx.services.pmsDatabase.task_types);
}

export async function taskEnumsHandler(request: Request, server: Server, ctx: IApiContext) {
    return find(request, server, ctx, ctx.services.pmsDatabase.task_enums);
}

export async function workTimesHandler(request: Request, server: Server, ctx: IApiContext) {
    return find(request, server, ctx, ctx.services.pmsDatabase.work_times);
}

export async function tasksHandler(request: Request, server: Server, ctx: IApiContext) {
    // Obtener id de la URL para los casos que lo precisan
    const id = parseId(request);

    // Crear tarea
    if (request.method === 'POST') {
        const user = await getRequestUser(request, ctx);

        // Registrar petición en el log
        ctx.services.logger.info(createRequestLogRecord(server, request, user?.username));

        // Usa la petición del cliente tal cual, cosa que implica que el cliente, por
        // su parte, debe usar el formato de datos de la API del PMS en el envío.
        const gTask = await ctx.services.pmsAPIClient.createTask(user, request);
        if (!gTask) {
            throw new APIException('error', 'Error creando tarea');
        }
        const task = await ctx.services.pmsDatabase.tasks.findById(user, gTask.task_id as number);

        return Response.json(task);
    }

    // Actualizar tarea
    if (request.method === 'PUT') {
        if (!id) {
            return new Response(null, { status: 400 });
        }

        const user = await getRequestUser(request, ctx);

        // Registrar petición en el log
        ctx.services.logger.info(createRequestLogRecord(server, request, user?.username));

        // Usa la petición del cliente tal cual, cosa que implica que éste, por
        // su parte, debe usar el formato de datos de la API del PMS en el envío.
        // TODO: revisar para el soporte de eliminación de documentos de la tarea.
        const gTask = await ctx.services.pmsAPIClient.updateTask(user, request, id)
        if (!gTask) {
            // La tarea ya no existe en la BD. Probablemente se ha eliminado.
            return new Response(null, { status: 204 });
        }

        const task = await ctx.services.pmsDatabase.tasks.findById(user, id);

        if (!task) {
            // La tarea ya no existe en la BD. Probablemente se ha eliminado.
            return new Response(null, { status: 204 });
        }

        return Response.json(task);
    }

    if (request.method === 'GET' && id) {
        if (!id) {
            return new Response(null, { status: 400 });
        }

        const user = await getRequestUser(request, ctx);
        const task = await ctx.services.pmsDatabase.tasks.findById(user, id);
        if (!task) {
            return new Response(null, { status: 404 });
        }

        return Response.json(task);
    }

    // Excluidos los casos anteriores, se devuelve la lista de tareas
    return find(request, server, ctx, ctx.services.pmsDatabase.tasks);
}

// TODO: revisar el soporte de eliminación de documentos de la tarea y
// optimizar con petición de varios documentos a la vez.
export async function tasksDocumentsHandler(request: Request, server: Server, ctx: IApiContext) {
    const id = parseId(request);

    // Si la petición es de un documento específico, se descarga el documento
    // desde el servidor PMS y se devuelve como respuesta. Si no se puede descargar
    // el documento, se devuelve una respuesta vacía con el código de estado 204 (No Content).
    // No son raros los casos en los que el archivo del documento no existe.
    if (id) {
        let document: ITaskDocument | undefined = undefined;
        const user = await getRequestUser(request, ctx);
        document = await ctx.services.pmsDatabase.task_documents.findById(user, id);
        if (document) {
            const url = `${ctx.configuration.pms.api.documentsHost}${document.relativeUrl}`;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    return new Response(null, { status: 204 });
                } else {
                    return response;
                }
            } catch (error) {
                return new Response(null, { status: 204 });
            }
        }

        return new Response(null, { status: 204 });
    }

    // Si la petición no es de un documento específico, se devuelve la lista de documentos
    return find(request, server, ctx, ctx.services.pmsDatabase.task_documents);
}

// ------------------------------------------------------------------------------------------------
// RESERVAS 
// ------------------------------------------------------------------------------------------------
export async function bookingHandler(request: Request, server: Server, ctx: IApiContext) {
    return find(request, server, ctx, ctx.services.pmsDatabase.booking);
}


/**
 * Función genérica de petición de lista de datos a la B.D.
 * @param { Request} request - Petición HTTP.
 * @param { Server} _server - Instancia del sevidor HTTP.
 * @param { IApiContext } ctx - Contexto del servidor.
 * @param { IRepository } repository - Repositorio de la B.D. al que debe hacerse la petición.
 * @returns { Promise<any[] | any> } - Lista de resultados.
 */
async function find(request: Request, server: Server, ctx: IApiContext, repository: IRepository<any, any>): Promise<any[] | any> {
    const user = await getRequestUser(request, ctx);

    // Registrar petición en el log (solo dev)
    // ctx.services.logger.info(createRequestLogRecord(server, request, user?.username));

    const page = parseRequestPage(request) as IResultSetPage<any, any>;
    const result = await repository.findAll(user, page);

    return Response.json(result);
}


/**
 * Devuelve los parámetros de página de resultados en función de los de la URL de
 * la petición. El conjunto de parámetros es parcial y se deja el establecimiento
 * de los valores por defecto, cuando falten o deban limitarse, a la implementación
 * de los repositorios de base de datos.
 * @param { Request } request - Petición HTTP.
 * @returns {Partial<IResultSetPage<any, any>>} - Parámetros de página de resultados.
 */
function parseRequestPage(request: Request): Partial<IResultSetPage<any, any>> {
    const url = new URL(request.url);
    const cursorParam = url.searchParams.get('cursor')?.trim();
    const rowsParam = url.searchParams.get('rows')?.trim();
    const sortParam = url.searchParams.get('sort')?.trim();

    const cursor = parseInt(cursorParam as string);
    const rows = parseInt(rowsParam as string);
    let sort: ISortColumn<any>[] = [];

    const sortParts = sortParam?.trim().split(',') ?? [];
    if (sortParts.length > 0) {
        sortParts.forEach((f) => {
            const sortColumn: ISortColumn<any> = {
                column: f.replace('+', '').replace('-', '').trim(),
                order: `${f.startsWith('-') ? 'desc' : 'asc'}`
            }

            if (sortColumn.column !== '') {
                sort.push(sortColumn);
            }
        });
    };

    return {
        cursor: isNaN(cursor) ? undefined : cursor,
        rows: isNaN(rows) ? undefined : rows,
        sort: sort ?? []
    }
}

/**
 * Función genérica para la obtención de un id de la URL de la petición.
 * @param request 
 * @returns 
 */
function parseId(request: Request): number | undefined {
    const parts = request.url.split('/');
    const id = parts[parts.length - 1];

    if (!id) return undefined;

    const key = parseInt(id ?? '');
    return isNaN(key) ? undefined : key;
}

