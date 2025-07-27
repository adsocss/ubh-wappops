// Seguridad
export type { IUser } from "../application/auth/IUser";
export type { ICredentials } from "../application/auth/ICredentials";

// Modelo de datos
export type { ICenter } from "../pms/database/centers/ICenter";
export type { ICenterBlock } from "../pms/database/centers/ICenterBlock";
export type { ICenterLocation } from "../pms/database/centers/ICenterLocation";
export type { IFloor } from "../pms/database/centers/IFloor";
export type { IRoom } from "../pms/database/centers/IRoom";
export type { IDepartment } from "../pms/database/hhrr/IDepartment";
export type { IEmployee } from "../pms/database/hhrr/IEmployee";
export type { IRoomRange } from "../pms/database/housekeeping/IRoomRange";
export type { IAsset } from "../pms/database/maintenance/IAsset";
export type { IResourceCounter } from "../pms/database/maintenance/IResourceCounter";
export type { ICounterRecord } from "../pms/database/maintenance/ICounterRecord";
export type { ITask } from "../pms/database/tasks/ITask";
export type { IGTask } from "../pms/api/tasks/IGTask";
export type { ITaskDocument } from "../pms/database/tasks/ITaskDocument";
export type { ITaskEnum } from "../pms/database/tasks/ITaskEnum";
export type { ITaskType } from "../pms/database/tasks/ITaskType";
export type { IWorkTime } from "../pms/database/tasks/IWorkTime";
export type { IReservation }  from "../pms/database/booking/IReservation";

// Notificaciones
export type { INotification, INotificationsChannel, ISubscriptionMessage } from "../application/notifications/INotification";

// Utilidades modelo
export {
    mapTask, mapTaskDocument,
} from "../pms/api/tasks/GTaskMapper";


// Peticiones API
export type { IResultSetPage } from "../application/db/IResulSetPage";

