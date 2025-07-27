import type { IUser } from "../auth/IUser";
import type { IResultSetPage } from "./IResulSetPage";

export type PrimaryKeyType = number | string;

export interface IRepository<T,K extends PrimaryKeyType> {
    findAll(user: IUser, page: IResultSetPage<T,K> | undefined): Promise<T[]>
    findById(user: IUser, id: K): Promise<T | undefined>
}



