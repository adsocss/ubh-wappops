import type { ICenter } from "../centers/ICenter"

export interface IResourceCounter {
    id: number
    name: string
    unitOfMeasure: string
    incremental: boolean
    center: ICenter
}