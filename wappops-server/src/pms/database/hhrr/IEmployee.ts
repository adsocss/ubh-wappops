import type { ICenter } from "../centers/ICenter"
import type { IDepartment } from "./IDepartment"

export interface IEmployee {
    id: number
    name: string
    surname1: string
    surname2: string
    fullName: string
    startsOn: Date
    endsOn: Date
    center: ICenter
    department: IDepartment
}