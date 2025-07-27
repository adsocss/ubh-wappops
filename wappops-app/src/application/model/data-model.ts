import type {
    IUser, ICredentials,
    ICenter, ICenterBlock, IFloor, ICenterLocation, IRoom,
    IDepartment, IEmployee,
    IRoomRange,
    IAsset, IResourceCounter, ICounterRecord,
    ITask, ITaskEnum, ITaskType, ITaskDocument, IWorkTime,
    IReservation,
    INotification,
    IResultSetPage
} from "../../../../wappops-server/src/model/data-model";

export {
    IUser, ICredentials,
    ICenter, ICenterBlock, IFloor, ICenterLocation, IRoom,
    IDepartment, IEmployee,
    IRoomRange,
    IAsset, IResourceCounter, ICounterRecord,
    ITask, ITaskEnum, ITaskType, ITaskDocument, IWorkTime,
    IReservation,
    INotification,
    IResultSetPage
}

export { mapTask } from "../../../../wappops-server/src/model/data-model";

export type ModelEntity =
    ICenter | ICenterBlock | IFloor | ICenterLocation | IRoom
    | IDepartment | IEmployee 
    | IRoomRange 
    | IAsset 
    | IResourceCounter | ICounterRecord 
    | ITask | ITaskEnum<any> | ITaskType | IWorkTime 
    | IReservation
    | INotification
;


    