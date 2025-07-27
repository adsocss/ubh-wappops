import type { Server } from "bun"
import { appendFile, exists, mkdir } from "node:fs/promises"

/* Registro de logging para peticiones*/
export interface IRequestLogRecord {
    username: string
    deviceId: string
    ip: string
    data: any
}

/**
 * Logger
 */
export default class Logger {
    private path: string;
    private currentFilename?: string;
    private ready = false;
    private queue: string[] = [];
    private _debug = false;

    constructor(path: string | undefined = undefined) {
        this.path = path ?? './logs';
        // Crear directorio si no existe.
        exists(this.path)
            .then(async (exists) => {
                if (!exists) await mkdir(this.path);
            })
            .then(() => this.ready = true)
            .then(() => this.flushQueue());
    }

    public set debug(value: boolean) {
        this._debug = value;
    }

    public get debug() {
        return this._debug;
    }

    public async info(msg: string | Object) {
        this.log('info', msg);
    }

    public async warning(msg: string | Object) {
        this.log('warning', msg);
    }

    public async error(msg: string | Object) {
        this.log('error', msg);
    }

    private async log(severity: 'info' | 'warning' | 'error', data: string | Object) {
        let msg: string | undefined = undefined
        if (data instanceof Error) {
            msg = `{ "message": "${data.message}"}`
        } else if (data instanceof Object) {
            msg = JSON.stringify(data, null, 2);
        } else if (typeof data === 'string') {
            msg = `{ "message": "${data}"}`;
        } else {
            msg = `{ "message": "${String(data)}}"`;
        }

        const lr = `[${severity.toUpperCase()}] - [${new Date().toISOString()}]: ${msg}\n`;
     
        if (this._debug) {
            console.log(lr);
        }
     
        this.queue.push(lr)
        if (!this.ready) {
            return;
        }

        this.flushQueue();
    }

    public async flushQueue() {
        this.setCurrentFile();
        while (this.queue.length > 0) {
            await appendFile(this.currentFilename as string, this.queue.shift() as string);
        }

        this.queue.forEach(async (lr) => {
            await appendFile(this.currentFilename as string, lr);
        });

        this.queue = [];
    }

    private async setCurrentFile() {
        const filename = `${this.path}/${new Date().toISOString().substring(0, 10)}.log`;
        if (filename !== this.currentFilename) {
            this.currentFilename = filename;
        }
    }
}

/******************************************************************************
 * FUNCIONES AUXILIARES
 */

/**
 * Crear un registro específico para las peticiones.
 * @param { Server } server - Instancia del servidor HTTP.
 * @param { Request } request - Petición.
 * @param { string | undefined } username - Nombre de usuario (opcional)
 * @returns { IRequestLogRecord } - Registro de petición.
 */
export function createRequestLogRecord(server: Server, request: Request, username: string | undefined = undefined): IRequestLogRecord  {
    return {
        username: username ?? 'unknown',
        deviceId: request.headers.get('X-Device-ID') ?? 'unknown',
        ip: server.requestIP(request)?.address ?? 'unknown',
        data: {
            endpoint: request.url,
            method: request.method
        }
    }
}