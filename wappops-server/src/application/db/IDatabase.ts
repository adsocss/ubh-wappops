export interface IDatabase {
    execute(statement: string): Promise<any[]>
    setDebug(debug: boolean): void
}