import { ICenter, ICenterBlock, IFloor, IRoomRange } from "@model/data-model";

export interface IRoomStatusListSettings {
    centers: ICenter[] | undefined
    blocks: ICenterBlock[] | undefined
    floors: IFloor[] | undefined
    ranges: IRoomRange[] | undefined
    status: 'clean' | 'dirty' | undefined
    withPendingTasks: boolean
    withArrivals: boolean
    withDepartures: boolean
}