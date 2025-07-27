import { Exception } from "../Exception";
import type { IUser } from "./IUser";

export class AuthorizationException extends Exception {
    readonly username: string;

    constructor(user: IUser | string, details?: string) {
        super('warning', 'Acceso denegado', details);
        this.username = typeof user === 'string' ? user : user.username;
    }
}