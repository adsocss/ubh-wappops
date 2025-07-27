export interface IListCard<T> {
    value: T | undefined
    selected: boolean
    selectable: boolean
    equals(other: IListCard<T>): boolean
    updateValue(): void
}