import { parseArgs } from 'util';
import type { IApplicationConfiguration } from "../config/IAplicationConfiguration";
import type { IWSConfiguration } from '../config/IWSConfiguration';


// Ruta por defecto del archivo de configuración.
const DEFAULT_CONFIGURATION_PATH = '.';
// Ruta por defecto del certificado SSL.
const DEFAULT_CERTIFICATE_PATH = './cert';
// Puerto por defecto del servidor.
const DEFAULT_PORT = 3000;


/**
 * Leer el archivo de configuración de la aplicación.
 * @param { string } path - Ruta del directorio donde se encuentra el archivo de configuración.
 *                          Si no se especifica se utilizará la ruta por defecto.
 * @returns { IApplicationConfiguration } - Objeto de configuración de la aplicación.
 * @throws { Error } - Si no se encuentra el archivo de configuración o si la configuración es inválida.
 */
export async function readConfiguration(path: string = DEFAULT_CONFIGURATION_PATH): Promise<IApplicationConfiguration> {
    const file = Bun.file(`${path}/config.json`);
    if (!(await file.exists())) {
        throw new Error(`No se ha encontrado el archivo de configuración ${path}/config.json`);
    }

    try {
        const config = await file.json() as IApplicationConfiguration;
        return validateConfiguration(config);
    } catch (error) {
        throw new Error(`Error al leer el archivo de configuración: ${error instanceof Error ? error.message : 'error desconocido'}`);
    }
}

// Validación de la configuración y aplicación de los valores por defecto donde sea admitido.
async function validateConfiguration(config: IApplicationConfiguration): Promise<IApplicationConfiguration> {

    // Aplicar modo de operación por defecto del servidor
    if (config.server?.operationMode !== 'production' && config.server?.operationMode !== 'test') {
        config.server.operationMode = 'production'; // Por defecto, modo producción
    }

    // Validar configuración del PMS
    if (!config.pms) {
        throw new Error('La configuración del PMS es obligatoria');
    }

    // Validar configuración de la base de datos del PMS
    if (!config.pms.database?.host) {
        throw new Error('No se ha configurado el host de la base de datos del PMS');
    }
    if (!config.pms.database?.database) {
        throw new Error('No se ha configurado la base de datos del PMS');
    }
    if (!config.pms.database?.username) {
        throw new Error('No se ha configurado el usuario de la base de datos del PMS');
    }
    if (!config.pms.database?.password) {
        throw new Error('No se ha configurado la contraseña de la base de datos del PMS');
    }

    // Validar configuración de la API del PMS
    if (!(config.pms.api?.dataHost && config.pms.api?.documentsHost)) {
        throw new Error('Las URL de la API del PMS son obligatorias');
    }

    // Validar confiuración de la clave de encriptación de los tokens
    if (!config.security?.secret) {
        throw new Error('La clave de encriptación es obligatoria');
    }
    if (config.security?.secret.length < 32) {
        throw new Error('La clave de encriptación debe tener al menos 32 caracteres');
    }

    // Validar configuración de Websocket para notificaciones
    if ((config.pms.ws ?? []).length === 0) {
        throw new Error('Falta la configuración de Websockets para notificaciones');
    }

    let wsTasksConfig = config.pms.ws.filter(ws => ws.topic === 'tasks');
    if (wsTasksConfig.length === 0) {
        throw new Error('Falta la configuración de Websockets para notificaciones de tareas');
    }

    if (!wsTasksConfig[0]?.host) {
        throw new Error('Configuración de Websockets: falta el "host"');
    }

    if (!wsTasksConfig[0].username) {
        throw new Error('Configuración de Websockets: falta el nombre de usuario');
    }

    if (!wsTasksConfig[0].password) {
        throw new Error('Configuración de Websockets: falta la contraseña de usuario');
    }


    // Aplicar valor por defecto para la duración de los tokens
    if (!config.security?.tokensDuration) {
        config.security.tokensDuration = 7 * 24; // Por defecto, 7 días
    }
    // Aplicar valor por defecto para los dominios implícitos (ninguno)
    if (!config.security?.implicitDomains) {
        config.security.implicitDomains = [];
    }

    // Aplicar valores por defecto para las tareas
    if (!config.tasks) {
        config.tasks = { timespan: [] };
    }

    if ((config.tasks?.timespan ?? []).length === 0) {
        config.tasks.timespan = [
            { status: 'closed', daysBefore: 7 } // Por defecto, tareas cerradas hace 7 días
        ];
    }

    // Aplicar valor por defecto para los contadores
    if (!config.counters) {
        config.counters = { recordsPerCounter: 10 }; // Por defecto, 10 registros por contador
    }


    config = await validateSslConfiguration(config);

    return config;
}

/**
 * Validar la configuración SSL y devolver la configuración modificada si es necesario.
 * Si los archivos de certificado o clave no existen, se anula la configuración 'tls'.
 */
async function validateSslConfiguration(config: IApplicationConfiguration): Promise<IApplicationConfiguration> {
    const certFilename = config.security.tls?.certificateFile ?? `${DEFAULT_CERTIFICATE_PATH}/certificate.crt`
    const certKeyFilename = config.security.tls?.privateKeyFile ?? `${DEFAULT_CERTIFICATE_PATH}/private.key`;

    // Comprobar si los archivos de certificado existen y anular la configuración
    // 'tls' si alguno de ellos no existe.
    const certFile = Bun.file(certFilename);
    if (!await certFile.exists()) {
        config.security.tls = undefined;
        return config;
    }

    const keyFile = Bun.file(certKeyFilename);
    if (!await keyFile.exists()) {
        config.security.tls = undefined;
        return config;
    }

    // Devolver la configuración con los archivos de certificado y clave modificados
    // por si se ha aplicado la ruta y nombres de archivo por defecto.
    return {
        ...config,
        security: {
            ...config.security,
            tls: {
                certificateFile: certFilename,
                privateKeyFile: certKeyFilename
            }
        }
    } as IApplicationConfiguration;
}

/**
 * Obtener los argumentos de la línea de comandos.
 * @returns - Objeto con los argumentos de la línea de comandos.
 */
export function getCmdArguments() {
    const { values, positionals } = parseArgs({
        args: Bun.argv,
        options: {
            port: {
                type: 'string',
                default: undefined,
            },
        },
        strict: false,
        allowPositionals: true,
    });

    return values;
}
