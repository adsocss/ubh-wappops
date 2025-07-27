import { ICenter, IDepartment, IRoom, ITask, ITaskEnum, ITaskType, IUser } from "@model/data-model";
import { Wappops } from "../../application/wappops";
import { canWriteTasks } from "../../application/utils/permissions-fns";

/**
 * Devuelve el estado por defecto de las tareas.
 * @param { Wappops } ctx - Contexto de la aplicación
 * @returns { Promise<ITaskEnum<'status'>> }
 */
export async function getDefaultStatus(ctx: Wappops): Promise<ITaskEnum<'status'>> {
    const value = await ctx.db.tasksEnums
        .filter(e => e.type === 'status')
        .filter(e => e.isDefault)
        .toArray();

    if (value.length !== 0) {
        return value[0];
    }

    // Si no hay valor por defecto, se devuelve el primero
    return (await ctx.db.tasksEnums.toArray()).find(e => e.type === 'status') as ITaskEnum<'status'>;
}

/**
 * Devuelve el estado de tarea cerrada.
 * @param { Wappops } ctx - Contexto de la aplicación
 * @returns { Promise<ITaskEnum<'status'>> }
 */
export async function getFinishedStatus(ctx: Wappops): Promise<ITaskEnum<'status'>> {
    const value = await ctx.db.tasksEnums
        .filter(e => e.type === 'status')
        .filter(e => e.code === 'closed')
        .toArray();

    if (value.length !== 0) {
        return value[0];
    }

    // Si no hay valor por defecto, se devuelve el primero
    return (await ctx.db.tasksEnums.toArray()).find(e => e.type === 'status') as ITaskEnum<'status'>;
}

/**
 * Devuelve la prioridad por defecto de las tareas.
 * @param { Wappops } ctx - Contexto de la aplicación
 * @returns { Promise<ITaskEnum<'status'>> }
 */
export async function getDefaultPriority(ctx: Wappops): Promise<ITaskEnum<'priority'>> {
    const value = await ctx.db.tasksEnums
        .filter(e => e.type === 'priority')
        .filter(e => e.isDefault)
        .toArray();

    if (value.length !== 0) {
        return value[0];
    }

    // Si no hay valor por defecto, se devuelve el primero
    return (await ctx.db.tasksEnums.toArray()).find(e => e.type === 'priority') as ITaskEnum<'priority'>;
}

/**
 * Devuelve el tipo de objeto de tarea por defecto para las tareas.
 * @param { Wappops } ctx - Contexto de la aplicación
 * @returns { Promise<ITaskEnum<'target-type'>> } - Tipo de objeto de tarea.
 */
export async function getDefaultTargetType(ctx: Wappops): Promise<ITaskEnum<'target-type'>> {
    const value = await ctx.db.tasksEnums
        .filter(e => e.type === 'target-type')
        .filter(e => e.isDefault)
        .toArray();
    if (value.length !== 0) {
        return value[0];
    }
    // Si no hay valor por defecto, se devuelve el primero
    return (await ctx.db.tasksEnums.toArray()).find(e => e.type === 'target-type') as ITaskEnum<'target-type'>;
}

/**
 * Devuelve el tiempo de trabajo por defecto para un tipo de tarea en una habitación específica,
 * basado esto último en el tipo de habitación, que es como está parametrizado en el PMS. Si no
 * se encuentra un tiempo de trabajo específico para la habitación y el tipo de tarea, se devuelve
 * el tiempo de trabajo por defecto del tipo de tarea.
 * 
 * @param { Wappops } ctx - Contexto de la aplicación
 * @param { IRoom } room - Habitación para la que se quiere obtener el tiempo de trabajo.
 * @param { ITask } taskType - Tipo de tarea para la que se quiere obtener el tiempo de trabajo.
 * @returns { number | undefined } - Tiempo de trabajo estimado para la tarea en la habitación.
 */
export async function getRoomDefaultWorkTime(ctx: Wappops, room: IRoom, taskType: ITaskType): Promise<number | undefined> {
    if (!(taskType)) {
        return undefined;
    }

    let workTime = taskType.estimatedWorkTime ?? 0;
    if (room && room.roomType) {
        workTime = (await ctx.db.workTimes
            .filter(ewt => ewt.roomTypeId === room.roomType.id && ewt.taskTypeId === taskType.id)
            .first())?.estimatedWorkTime ?? workTime;
    }

    return workTime;
}

/**
 * Devuelve el tipo de tarea para las solicitudes de limpieza si se ha configurado en Guest PMS.
 * @param ctx - Contexto de la aplicación
 * @returns { Promise<ITaskType | undefined> } - Tipo de tarea si existe, undefined si no se ha configurado.
 */
export async function getCleaningRequestTaskType(ctx: Wappops): Promise<ITaskType | undefined> {
    const taskTypes = await ctx.db.tasksTypes
        .filter(t => t.isCleanTask)
        .toArray();

    if (taskTypes.length > 0) {
        return taskTypes[0];
    }

    return undefined;
}

/**
 * Determina si el usuario actual puede modificar una tarea determinada.
 * @param { Wappops } ctx - Contexto de la aplicación
 * @param { ITask } task - Tarea a comprobar
 * @returns { boolean} - Devuelve true si el usuario puede modificar la tarea, false en caso contrario.
 */
export function canModifyTask(ctx: Wappops, task: ITask): boolean {
    if (!task) {
        return false;
    }

    // Si el usuario no tiene permisos para escribir tareas, no puede modificar ninguna
    if (!canWriteTasks(ctx.currentUser as IUser)) {
        return false;
    }

    // Si la tarea fue creada por el usuario actual, puede modificarla 
    if (task.createdByUsername === ctx.currentUser?.username) {
        return true;
    }

    // Si la tarea es del departamento del usuario actual, puede modificarla
    if (task.department?.id === ctx.currentUser?.department?.id) {
        return true;
    }

    return false;
}

/**
 * Crea una nueva tarea con los valores por defecto.
 * @param { Wappops } ctx -Contexto de la aplicación
 * @returns { Promise<ITask> } - Nueva tarea creada
 */
export async function createTask(ctx: Wappops): Promise<Partial<ITask>> {
    return {
        id: undefined,
        number: undefined,
        status: await getDefaultStatus(ctx),
        priority: await getDefaultPriority(ctx),
        description: '',
        locksRoom: false,
        lockPlanned: false,
        scheduled: false,
        insuranceNotified: false,
        courtesyCallDone: false,

        center: ctx.currentUser?.employee?.center as ICenter,
        department: ctx.currentUser?.employee?.department as IDepartment,

        taskType: undefined,
        targetType: await getDefaultTargetType(ctx),
        taskTarget: undefined,

        createdOn: new Date(),
        createdBy: ctx.currentUser?.employee,
        createdByUsername: ctx.currentUser?.username,

        notifiedOn: new Date(),
        notifiedBy: ctx.currentUser?.employee,
        startedOn: new Date(),

        reportTo: undefined,
        assignedTo: undefined,
        workTime: 0,

        documents: [],
        localId: undefined,
        syncStatus: 'pending',
        requestCleaning: false,
    };
}

/**
 * Crear tarea de solicitud de limpieza.
 * @param  { Wappops } ctx - Contexto de la aplicación
 * @param { ITask } parentTask - Tarea padre para la que se solicita limpieza
 * @returns { Promise<ITask | undefined> } - Tarea de solicitud de limpieza creada o undefined si no se ha configurado el tipo de tarea.
 */
export async function createCleaningRequestTask(ctx: Wappops, parentTask: ITask): Promise<ITask | undefined> {
    const taskType = await getCleaningRequestTaskType(ctx);
    if (!taskType) {
        return undefined;
    }

    let workTime = taskType.estimatedWorkTime;
    if (parentTask.targetType.code === 'room') {
        workTime = await getRoomDefaultWorkTime(ctx, parentTask.taskTarget as IRoom, taskType) ?? workTime;
    }

    return {
        ...await createTask(ctx),
        id: undefined,
        number: undefined,
        department: taskType.department,
        taskType: taskType,
        description: `Solicitud de limpieza para la tarea Nº ${parentTask.number}`,
        targetType: parentTask.targetType,
        taskTarget: parentTask.taskTarget,
        requestCleaning: false,
        workTime: workTime,
    } as ITask;
}

/**
 * Guarda la tarea en la BD local y la sincroniza con el servidor si es posible.
 * @param { Wappops } ctx - Contexto de la aplicación
 * @param { ITask } task  - Tarea a guardar
 * @returns { Promise<ITask> } - Tarea guardada o sincronizada. Si ha sido posible sincronizar con
 *                               el servidor, se devuelve la tarea actualizada con los datos del servidor.
 *                               Esto es particularmente determinante puesto que mientras no se sincronice,
 *                               la tarea no tendrá una clave primaria (no confundir con la de la BD local)
 *                               ni un número de tarea.
 */
export async function saveTask(ctx: Wappops, task: ITask): Promise<ITask> {

    // Validar antes de guardar.
    validateTask(task);

    let savedTask: ITask = { ...task, syncStatus: 'pending' };

    // Parar tarea periódica de sincronización para evitar envíos duplicados.
    ctx.synchronizer.stopPeriodicTask();

    // Guardar localmente
    if (task.localId) {
        await ctx.db.tasks.update(task.localId, savedTask);
    } else {
        const localId = await ctx.db.tasks.put(savedTask);
        savedTask = { ...savedTask, localId: localId } as ITask;
    }

    // Sincronizar con el servidor si es posible
    try {
        const sentTask = await ctx.api.sendTask(task);

        if (sentTask) {
            savedTask = { ...sentTask, localId: savedTask.localId };
            await ctx.db.tasks.update(savedTask.localId, savedTask);
        }

    } catch (error) {
        // Aquí, ignorar error de sincronización.
        // La tarea queda pendiente de envío
        console.error(error)
    } finally {
        // Reiniciar tarea periódica de sincronización
        ctx.synchronizer.startPeriodicTask();
    }

    // Si la tarea incluye una solicitud de limpieza, crear la tarea de limpieza
    // guardarla y enviarla .
    if (task.requestCleaning) {
        const cleaningTask = await createCleaningRequestTask(ctx, savedTask);
        if (cleaningTask) {
            // Guardar la tarea de limpieza
            await saveTask(ctx, cleaningTask);
        }
    }

    return savedTask;
}

/**
 * Valida los datos de una tarea.
 * @param { ITask } task - Tarea a validar.
 */
export function validateTask(task: ITask) {
    if (!task.center) {
        throw new Error('Error: no se ha especificado Centro');
    }
    if (!task.department) {
        throw new Error('Error: no se ha especificado Departamento');
    }
    if (!task.taskType) {
        throw new Error('Error: no se ha especificado Tipo de tarea');
    }
    if (!task.taskTarget) {
        throw new Error('Error: no se ha especificado Objeto de la tarea');
    }
    if (!task.status) {
        throw new Error('Error: no se ha especificado Estado de la tarea');
    }
    if (!task.priority) {
        throw new Error('Error: no se ha especificado Prioridad de la tarea');
    }
}