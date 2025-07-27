import type { IUser } from "../auth/IUser";
import type { ISecurityConfiguration } from "../config/ISecurityConfiguration";
import * as jwtlib from "jose";

/**
 * Crear token se seguridad.
 * @param { IUser } user - Usuario para el que se va a crear el token.  
 * @param { ISecurityConfiguration } configuration  - Configuración de seguridad.
 * @returns { string } - Token de seguridad.
 */
export async function createToken(user: IUser, configuration: ISecurityConfiguration) {
    const key = jwtlib.base64url.decode(configuration.secret);
    const expiration = configuration.tokensDuration ? configuration.tokensDuration : 168;

    return await new jwtlib.SignJWT({ user })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${expiration} hours`)
        .sign(key);
}

/**
 * Validar token de seguridad.
 * @param { string } token - Token a validar.   
 * @param { ISecurityConfiguration} configuration - Configuración de seguridad.
 * @returns { Promise<jwtlib.JWTPayload> } - Información del usuario del token.
 */
export async function validateToken(token: string, configuration: ISecurityConfiguration) {
    const key = jwtlib.base64url.decode(configuration.secret);
    const { payload, protectedHeader } = await jwtlib.jwtVerify(token, key);
    return payload;
}