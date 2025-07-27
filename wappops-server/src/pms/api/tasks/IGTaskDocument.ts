export interface IGTaskDocument {
    document_id?: number
    date: Date
    description: string
    fileName: string
    accessUrl?: string
    contents?: Blob
}