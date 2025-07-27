import type { Server } from "bun";
import { createRequestLogRecord } from "../../services/logger";
import { FUNCTIONAL_ROLES, SYSTEM_USER } from "../auth/AuthConstants";
import { AuthorizationException } from "../auth/AuthorizationException";
import type { ICredentials } from "../auth/ICredentials";
import type { IUser } from "../auth/IUser";
import type { IApiContext } from "./IApiContext";
import { createToken, validateToken } from "./jwt";

export async function loginHandler(request: Request, server: Server, ctx: IApiContext) {
    const {username, password} = await request.json() as ICredentials;        

    if (!(username || password)) {
        throw new AuthorizationException(username);
    }

    // Tratar login con nombre de usuario "corto" combinándolo, si es el caso,
    // con los dominios implícitos configurados.
    const names: string[] = [];
    names.push(username);
    if (!username.includes('@')) {
        (ctx.configuration.security.implicitDomains ?? [])
            .map(d => `${username}@${d}`)
            .forEach(n => names.push(n));
    }

    // Buscar usuario en la B.D.
    const result = await ctx.services.pmsDatabase.users.findByUsername(SYSTEM_USER, names);

    if (result.length !== 1) {
        throw new AuthorizationException(username);
    }
    const user = result[0] as IUser;

    // Comprobar que el usuario tiene permisos para acceder a la aplicación y, al menos,
    // a una de las funcionalidades de la misma.
    if (!user.roles.includes('wappops')) {   
        throw new AuthorizationException(username, 'Usuario sin permisos para acceder a la aplicación WappOps');
    }

    let functionalRolesCount = 0;
    for (const funcionalRole of FUNCTIONAL_ROLES) {
        if (user.roles.includes(funcionalRole)) {
            functionalRolesCount++;
        }
    }
    if (functionalRolesCount === 0) {
        throw new AuthorizationException(username, 'El usuario no tiene roles funcionales asignados');
    }


    // Login en la API del PMS
    const ok = await ctx.services.pmsAPIClient.apiLogin(user?.username, password);

    if (!ok) {
        throw new AuthorizationException(username);
    }




    // Crear y añadir token a las autorizaciones del usuario.
    const token = await createToken(user, ctx.configuration.security);
    user.authorizations.token = token;

    // Registrar login
    ctx.services.logger.logInfo(createRequestLogRecord(server, request, user.username));

    const response = new Response(JSON.stringify(user));
    response.headers.append("Access-Control-Allow-Headers",'*');
    response.headers.append("Access-Control-Allow-Methods",'*');
    response.headers.append("Access-Control-Allow-Origin",'*');

    return response;
}

/**
 * Devuelve el usuario de la petición.
 * @param { Request} request - Petición HTTP.
 * @param { IApiContext } ctx - Contexto de aplicación.
 * @returns { Promise<IUser> } - Usuario de la petición-
 * @throws { AuthorizationException } - Si la petición carece de token de seguridad
 *                                      en sus cabeceras o no es válido.
 */
export async function getRequestUser(request: Request, ctx: IApiContext): Promise<IUser> {
    const configuration = ctx.configuration.security;
    const token = request.headers.get('Authorization')?.split(" ")[1];

    if (!token) {
        throw new AuthorizationException('unknown','Petición sin token');
    }

    try {
        const { user } = await validateToken(token, configuration);
        return user as IUser;
    } catch (error) {
        throw new AuthorizationException('unknown', 'Token inválido:\n ' + (error as Error).message);
    }
}
