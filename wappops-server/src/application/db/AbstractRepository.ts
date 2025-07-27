import { CENTER_SECURITY_COLUMN, DEPARTMENT_SECURITY_COLUMN } from "../auth/AuthConstants";
import type { IUser } from "../auth/IUser";
import { DatabaseException } from "./DatabaseException";
import type { IDatabase } from "./IDatabase";
import type { IRepository, PrimaryKeyType } from "./IRepository";
import { MAX_PAGE_ROWS, type IResultSetPage } from "./IResulSetPage";

export abstract class AbstractRepository<T,K extends PrimaryKeyType> implements IRepository<T,K> {
    protected db: IDatabase;
    protected keyType: string;
    protected ctes: string | undefined = undefined;

    constructor(database: IDatabase, keyType: 'number' | 'string' = 'number') {
        this.db = database;
        this.keyType = keyType;
    }

    async findAll(user: IUser, page: IResultSetPage<T, K> | undefined = undefined): Promise<T[]> {
        const cursor = page?.cursor ?? (this.keyType === 'number' ? 0 : '');
        const rows = Math.min((page?.rows ?? MAX_PAGE_ROWS), MAX_PAGE_ROWS);
        const order = (page?.sort ?? []).map(s => `${String(s.column)} ${s.order}`);
        order.push('primary_key ASC');        

        const query = `
            ${this.ctes ?? ''}
            SELECT * FROM (${this.getQuery()}) AS PS
            WHERE primary_key > ${this.keyType === 'number' ? cursor : `'${cursor}'`}
                AND (${this.getSecurityFilter(user)})
            ORDER BY ${order.join(',')}
            OFFSET 0 ROWS FETCH NEXT ${rows} ROWS ONLY
        `;

        const result = await this.db.execute(query);

        return result.map(row => this.removeControlColumns(row)).map(row => this.map(row));
    }

    async findById(user: IUser, id: K): Promise<T | undefined> {
        const query = `
            ${this.ctes ?? ''}
            SELECT * FROM (${this.getQuery()}) AS S
            WHERE primary_key = ${this.keyType === 'number' ? id : `'${id}'`}
        `;

        const result = await this.db.execute(query);
        if (result.length === 0) {
            return undefined;
        }

        if (result.length > 1) {
            throw new DatabaseException('fatal', 'Se esperaba solo una fila');
        }

        return this.map(this.removeControlColumns(result[0]));
    }

    protected addCtes(ctes: string) {
        this.ctes = ctes;
    }

    protected getSecurityFilter(user: IUser) {
        const centerFilter = user.authorizations.centerIds === '*'
            ? '1 = 1'
            : `${CENTER_SECURITY_COLUMN} IN(${user.authorizations.centerIds.join(',')})`;

        const departmentFilter = user.authorizations.departmentIds === '*'
            ? '1 = 1'
            : `${DEPARTMENT_SECURITY_COLUMN} IN(${user.authorizations.departmentIds.join(',')})`;
         
        return `
            (${CENTER_SECURITY_COLUMN} IS NULL OR ${centerFilter}) AND (${DEPARTMENT_SECURITY_COLUMN} IS NULL OR ${departmentFilter})
        `
    }

    private removeControlColumns(row: any): any {
        delete row['primary_key'];
        delete row[CENTER_SECURITY_COLUMN];
        delete row[DEPARTMENT_SECURITY_COLUMN];

        return row;
    }

    protected abstract map(row: any): T
    protected abstract getQuery(): string;
}