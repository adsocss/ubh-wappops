import { GuestAPIClient } from "../../services/GuestAPIClient";
import { NOTIFICATIONS_SERVICE_NAME, NotificationsService } from "../../services/NotificationsService";
import { PMSDatabase } from "../../services/PMSDatabase";
import Logger, { createRequestLogRecord } from "../../services/logger";
import type { IApiContext } from "../api/IApiContext";
import { getRequestUser, loginHandler } from "../api/auth-handlers";
import {
    assetsHandler, blocksHandler,
    bookingHandler,
    centersHandler, countersHandler, countersRecordsHandler, departmentsHandler, employeesHandler,
    floorsHandler, locationsHandler, roomRangesHandler, roomsHandler, roomStatusHandler,
    taskEnumsHandler,
    tasksDocumentsHandler,
    tasksHandler, taskTypesHandler,
    workTimesHandler
} from "../api/data-handlers";
import { handleStatus } from "../api/status-handler";
import { WebPushAPI } from "../api/WebPushAPI";
import { AuthorizationException } from "../auth/AuthorizationException";
import type { IApplicationConfiguration } from "../config/IAplicationConfiguration";
import { getCmdArguments, readConfiguration } from "./lib";

// Configuración del servidor basada en variables de entorno. ----------------------
const devMode = process.env.NODE_ENV !== 'production'; // Auto-detect based on NODE_ENV
const devConfigPath = process.env.WAPPOPS_CONFIG_PATH || '../ztest';
const devPublicPath = process.env.WAPPOPS_PUBLIC_PATH || '../ztest/public';
const devLogsPath = process.env.WAPPOPS_LOGS_PATH || '../ztest/logs';

// Log environment configuration for debugging
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Dev Mode: ${devMode}`);
console.log(`Config Path: ${devConfigPath}`);
console.log(`Public Path: ${devPublicPath}`);
console.log(`Logs Path: ${devLogsPath}`);
// --------------------------------------------------------------------------------

// Iniciar servicio de logging
const logger = new Logger(devMode ? devLogsPath : undefined, {
    isDevelopment: devMode,
    enableColors: devMode,
    logLevel: devMode ? 0 : 1, // DEBUG in dev, INFO in production
    component: 'SERVER'
});

// Ruta por defecto de los archivos estáticos (la App cliente de Operaciones debe estar aquí).
const DEFAULT_STATIC_FILES_PATH = devMode ? devPublicPath : './public';

// Cargar la configuración de la aplicación.
let configuration: IApplicationConfiguration | undefined = undefined;
try {
    configuration = await readConfiguration(devMode ? devConfigPath : undefined);

    // Reconfigurar puerto si se ha especificado en los argumentos de la línea de comandos.
    let cmdPort = parseInt(getCmdArguments().port as string ?? '');
    if (cmdPort && !isNaN(cmdPort)) {
        configuration.server.port = cmdPort;
    }
} catch (error) {
    // Registrar error en el log y finalizar la aplicación.
    logger.logError(error as Error);
    await logger.flushQueue();
    console.error((error as Error).message);
    process.exit(1);
}

// Registrar configuración en el log
const configLog: IApplicationConfiguration = JSON.parse(JSON.stringify(configuration));
configLog.security.secret = "*******";
configLog.pms.database.username = "*******";
configLog.pms.database.password = "*******";
configLog.pms.ws.forEach((wsc: any) => {
    wsc.username = '*******';
    wsc.password = '*******';
});

logger.logInfo(configLog);

// Obtener archivos tls
let certFile = configuration.security?.tls?.certificateFile ? Bun.file(configuration.security.tls.certificateFile) : undefined;
let keyFile = configuration.security?.tls?.privateKeyFile ? Bun.file(configuration.security.tls.privateKeyFile) : undefined;
if (!(certFile && keyFile)) {
    certFile = undefined;
    keyFile = undefined;
}

// Iniciar servicios de la aplicación.
const pmsDatabase = new PMSDatabase(configuration);
const apiClient = new GuestAPIClient(configuration, logger);

// Inicializar contexto temporal para crear el servicio de notificaciones.
const tempContext: IApiContext = {
    configuration: configuration,
    services: {
        pmsAPIClient: apiClient,
        pmsDatabase: pmsDatabase,
        logger: logger,
        notifications: null as any // Temporal, se asignará después
    }
}

// Crear servicio de notificaciones
const notificationsService = new NotificationsService(tempContext);

// Actualizar contexto con el servicio de notificaciones completo
const context: IApiContext = {
    configuration: configuration,
    services: {
        pmsAPIClient: apiClient,
        pmsDatabase: pmsDatabase,
        logger: logger,
        notifications: notificationsService
    }
}

// Iniciar servidor HTTP
const server = Bun.serve({
    hostname: "0.0.0.0", // Bind to all interfaces for network access
    port: configuration.server.port,
    tls: {
        key: keyFile,
        cert: certFile
    },

    async fetch(request, server) {
        const url = new URL(request.url);
        const path = url.pathname;

        // Respuesta por defecto
        let response = new Response(null, { status: 404, statusText: 'Not Found' });

        // CORS preflight
        if (request.method === 'OPTIONS') {
            response = new Response(null, { status: 200, statusText: 'OK' });
            return addCorsHeaders(response);
        }

        try {
            // Estado del servidor
            if (path === '/status') {
                return handleStatus(context);
            }

            // Servir archivos estáticos.
            if (!path.startsWith('/api')) {
                return serveStaticFile(request);
            }

            // Autenticación
            if (path === '/api/login') {
                response = await loginHandler(request, server, context);
            }

            if (path === '/api/logout') {
                const user = await getRequestUser(request, context);
                logger.logInfo(createRequestLogRecord(server, request, user?.username));
                response = new Response(null, { status: 200, statusText: 'OK' });
            }

            if (path === '/api/login/validate' && request.method === 'GET') {
                // Comprobar si el usuario está autenticado
                const user = await getRequestUser(request, context);
                if (!user) {
                    throw new AuthorizationException('unkonwn', 'Unauthorized');
                }

                // Comprobar si el usuario tiene sesión activa en el cliente de la
                // API de Guest PMS.
                if (!context.services.pmsAPIClient.hasSession(user.username)) {
                    throw new AuthorizationException(user.username, 'Unauthorized');
                }

                response = new Response(JSON.stringify(user));
            }

            // Centros
            if (path.startsWith('/api/centers') && request.method === 'GET') {
                if (path === '/api/centers') {
                    response = await centersHandler(request, server, context);
                } else if (path === '/api/centers/blocks') {
                    response = await blocksHandler(request, server, context);
                } else if (path === '/api/centers/floors') {
                    response = await floorsHandler(request, server, context);
                } else if (path === '/api/centers/rooms') {
                    response = await roomsHandler(request, server, context);
                } else if (path === '/api/centers/locations') {
                    response = await locationsHandler(request, server, context);
                }
            }

            // RR.HH.
            if (path.startsWith('/api/hhrr') && request.method === 'GET') {
                if (path === '/api/hhrr/departments') {
                    response = await departmentsHandler(request, server, context);
                } else if (path === '/api/hhrr/employees') {
                    response = await employeesHandler(request, server, context);
                }
            }

            // Limpieza
            if (path.startsWith('/api/housekeeping')) {
                if (path === '/api/housekeeping/roomranges' && request.method === 'GET') {
                    response = await roomRangesHandler(request, server, context);
                } else if (path.startsWith('/api/housekeeping/roomstatus') && request.method === 'PUT') {
                    response = await roomStatusHandler(request, server, context);
                }
            }

            // Mantenimiento
            if (path.startsWith('/api/maintenance')) {
                if (path === '/api/maintenance/counters' && request.method === 'GET') {
                    response = await countersHandler(request, server, context);
                } else if (path === '/api/maintenance/counters/records') {
                    response = await countersRecordsHandler(request, server, context);
                } else if (path === '/api/maintenance/assets' && request.method === 'GET') {
                    response = await assetsHandler(request, server, context);
                }
            }

            // Tareas
            if (path.startsWith('/api/tasks')) {
                if (path.startsWith('/api/tasks') && (request.method === 'POST' || request.method === 'PUT')) {
                    response = await tasksHandler(request, server, context);
                } else if (path === '/api/tasks' && request.method === 'GET') {
                    response = await tasksHandler(request, server, context);
                } else if (path === '/api/tasks/enums' && request.method === 'GET') {
                    response = await taskEnumsHandler(request, server, context);
                } else if (path === '/api/tasks/worktimes' && request.method === 'GET') {
                    response = await workTimesHandler(request, server, context);
                } else if (path === '/api/tasks/types' && request.method === 'GET') {
                    response = await taskTypesHandler(request, server, context);
                } else if (path.startsWith('/api/tasks/documents') && request.method === 'GET') {
                    response = await tasksDocumentsHandler(request, server, context);
                }
            }

            // Booking
            if (path.startsWith('/api/booking')) {
                if (path === '/api/booking' && request.method === 'GET') {
                    response = await bookingHandler(request, server, context);
                }
            }

            // Notifications - Web Push API
            if (path.startsWith('/api/notifications/push')) {
                // VAPID public key (no authentication required for client setup)
                if (path === '/api/notifications/push/vapid-key' && request.method === 'GET') {
                    response = await WebPushAPI.getVapidKey(context);
                }
                // Debug endpoint (development only)
                else if (path === '/api/notifications/push/debug' && request.method === 'GET') {
                    response = await WebPushAPI.getDebugInfo(context);
                }
                // Subscription management (authentication required)
                else {
                    const user = await getRequestUser(request, context);
                    if (user) {
                        if (path === '/api/notifications/push/subscribe' && request.method === 'POST') {
                            response = await WebPushAPI.subscribe(context, user, request);
                        } else if (path === '/api/notifications/push/unsubscribe' && request.method === 'POST') {
                            response = await WebPushAPI.unsubscribe(context, user, request);
                        } else if (path === '/api/notifications/push/test' && request.method === 'POST') {
                            response = await WebPushAPI.sendTestNotification(context, user, request);
                        }
                    } else {
                        response = new Response(JSON.stringify({ error: 'Authentication required' }), { 
                            status: 401, 
                            headers: { 'Content-Type': 'application/json' } 
                        });
                    }
                }
            }

        } catch (error) {
            if (error instanceof AuthorizationException) {
                if (path === '/api/login/validate') {
                    logger.logWarning(createRequestLogRecord(server, request, error.username));
                } else {
                    logger.logError(createRequestLogRecord(server, request, error.username));
                }

                response = new Response(null, { status: 401, statusText: 'Unauthorized' });
            } else {
                logger.logError(error as Object);

                response = new Response(null, { status: 500, statusText: 'Internal Server Error' });
            }
        }


        return addCorsHeaders(response);
    }

});

// Feed back consola
console.log(`Servidor iniciado en ${server.url}`);
console.log('Modo de operación:', configuration.server.operationMode === 'production' ? 'Producción' : 'Pruebas');

/*****************************************************************************************************************
 * FUNCIONES AUXILIARES
 ****************************************************************************************************************/


/* Añadir cabeceras CORS */
function addCorsHeaders(response: Response): Response {
    response.headers.set("Access-Control-Allow-Headers", '*');
    response.headers.set("Access-Control-Allow-Methods", '*');
    response.headers.set("Access-Control-Allow-Origin", '*');
    return response;
}

/**
 * Servir contenido estático
 * @param { Request } request - Petición HTTP
 * @returns { Promise<Response> } - Respuesta HTTP
 */
async function serveStaticFile(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const filename = `${DEFAULT_STATIC_FILES_PATH}/${path}`.replace('//', '/');

    const file = Bun.file(filename);
    if (await file.exists()) {
        let response = new Response(await file.bytes());
        response = addCorsHeaders(response);
        response.headers.append('Content-Type', file.type);

        return response;
    }

    return new Response(null, { status: 404 });
}