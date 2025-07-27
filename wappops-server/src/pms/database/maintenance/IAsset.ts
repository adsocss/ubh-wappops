import type { ICenter } from "../centers/ICenter"

export interface IAsset {
    id: number
    code: string
    name: string
    reference: string
    retired: boolean
    center: ICenter
    store: {
        id: number
        name: string
    }
}
