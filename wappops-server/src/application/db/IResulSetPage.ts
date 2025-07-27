import type { PrimaryKeyType } from "./IRepository"

export const MAX_PAGE_ROWS = 200;

export interface ISortColumn<T> {
    column: keyof T
    order: 'asc' | 'desc'
}

export interface IResultSetPage<T, K extends PrimaryKeyType> {
    cursor: K
    rows: number
    sort: ISortColumn<T>[]
}
