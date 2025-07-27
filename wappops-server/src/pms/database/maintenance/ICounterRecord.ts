import type { IResourceCounter } from "../maintenance/IResourceCounter"

export interface ICounterRecord {
    id: number
    date: Date
    value: number
    isConsumption: boolean
    reset: boolean
    remarks: string
    counter: IResourceCounter

    syncStatus: 'synced' | 'pending'
    localId?: number
}