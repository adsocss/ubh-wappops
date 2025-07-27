export interface IGCounterRecord {
    measure: number
    date: Date
    filledOrReset: boolean
}

export interface ICounterRecordResponse {
    counterReading_id: number
    measure: number
    registerDate: Date
    notConsumption: boolean
    observations: string
}
