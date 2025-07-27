import type { IRoomRange } from "../housekeeping/IRoomRange"
import type { ICenter } from "./ICenter"
import type { ICenterBlock } from "./ICenterBlock"
import type { IFloor } from "./IFloor"

export interface IRoom {
    id: number
    number: string
    // Mantener para compatibilidad con versiones anteriores
    type: string
    typeName: string

    // Nuevo v0.5.0-beta
    roomType: {
        id: number
        code: string
        name: string
        detail: string
    }

    locked: boolean
    clean: boolean
    center: ICenter
    block?: ICenterBlock
    floor?: IFloor
    range?: IRoomRange

    syncStatus?: 'synced' | 'pending'
}
