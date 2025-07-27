import { serve } from "bun";
import type { IApiContext } from "./IApiContext";

// Tipo de los valores de estado
type status = 'ok' | 'failing';

// Tipo del estado del servidor
type ServerStatus = {
    status: status;
    database: status;
    api: status;
};

/** 
 * Comprueba y devuelve el estado de los servicios de los que depende
 * de este servidor.
 * 
 */
export async function handleStatus(ctx: IApiContext) {
    // Estado inicial de la respuesta por defecto
    const serverStatus = {
        status: 'failing' as status,
        database: 'failing' as status,
        api: 'failing' as status,
    }

    await Promise.all([
        // Verifica el estado de la base de datos
        ctx.services.pmsDatabase.status()
            .then((status) => {
                serverStatus.database = status;
            })
            .catch((error) => {
                serverStatus.database = 'failing';
            }),

        // Verifica el estado de la API
        ctx.services.pmsAPIClient.status()
            .then((status) => {
                serverStatus.api = status;
            })
            .catch((error) => {
                serverStatus.api = 'failing';
            })
    ]);

    // Estado del servidor
    serverStatus.status = (serverStatus.database === 'ok' && serverStatus.api === 'ok') ? 'ok' : 'failing';

    console.log('Estado del servidor:', serverStatus);

    return Response.json(serverStatus)
}
