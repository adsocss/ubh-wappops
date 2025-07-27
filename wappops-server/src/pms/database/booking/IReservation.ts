import type { ICenter } from "../centers/ICenter"

export interface IReservation {
    id: number
    numberSeries: number
    number: number
    roomIndex: number
    locator: string
    status: 'new' | 'confirmed' | 'check-in' | 'check-out' | 'no-show'
    arrival: Date
    departure: Date
    holder: string
    adults: number
    juniors: number
    children: number
    babies: number
    center: ICenter
    ttoo: {
        code: string
        name: string
    },
    agency: {
        code: string
        name: string
    },
    roomId: number
}
