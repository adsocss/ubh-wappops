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
 * Log levels enum
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARNING = 2,
    ERROR = 3
}

/**
 * Enhanced logging configuration
 */
export interface LoggerConfig {
    isDevelopment?: boolean;
    logLevel?: LogLevel;
    enableColors?: boolean;
    enableTimestamp?: boolean;
    component?: string;
}

/**
 * Logger
 */
export default class Logger {
    private path: string;
    private currentFilename?: string;
    private ready = false;
    private queue: string[] = [];
    private config: LoggerConfig;
    
    // ANSI color codes for console output
    private readonly colors = {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        dim: '\x1b[2m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        gray: '\x1b[90m'
    };

    constructor(path: string | undefined = undefined, config: LoggerConfig = {}) {
        this.path = path ?? './logs';
        this.config = {
            isDevelopment: config.isDevelopment ?? false,
            logLevel: config.logLevel ?? LogLevel.INFO,
            enableColors: config.enableColors ?? true,
            enableTimestamp: config.enableTimestamp ?? true,
            component: config.component
        };
        
        // Crear directorio si no existe.
        exists(this.path)
            .then(async (exists) => {
                if (!exists) await mkdir(this.path);
            })
            .then(() => this.ready = true)
            .then(() => this.flushQueue());
    }

    /**
     * Legacy debug setter for backward compatibility
     */
    public set debug(value: boolean) {
        this.config.isDevelopment = value;
    }

    public get debug() {
        return this.config.isDevelopment ?? false;
    }

    /**
     * Set logger configuration
     */
    public configure(config: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    public logDebug(msg: string | Object, component?: string) {
        this.log(LogLevel.DEBUG, msg, component);
    }

    public logInfo(msg: string | Object, component?: string) {
        this.log(LogLevel.INFO, msg, component);
    }

    public logWarning(msg: string | Object, component?: string) {
        this.log(LogLevel.WARNING, msg, component);
    }

    public logError(msg: string | Object, component?: string) {
        this.log(LogLevel.ERROR, msg, component);
    }

    /**
     * Enhanced logging method with better formatting and console output
     */
    private async log(level: LogLevel, data: string | Object, component?: string) {
        // Check if this log level should be output
        if (level < this.config.logLevel!) {
            return;
        }

        const timestamp = this.config.enableTimestamp ? new Date().toISOString() : '';
        const levelName = LogLevel[level].toUpperCase();
        const componentName = component || this.config.component || '';
        
        let messageContent: string;
        if (data instanceof Error) {
            messageContent = JSON.stringify({
                error: data.message,
                stack: data.stack,
                ...(componentName && { component: componentName })
            }, null, 2);
        } else if (data instanceof Object) {
            messageContent = JSON.stringify({
                ...(data as any),
                ...(componentName && { component: componentName })
            }, null, 2);
        } else if (typeof data === 'string') {
            messageContent = JSON.stringify({
                message: data,
                ...(componentName && { component: componentName })
            }, null, 2);
        } else {
            messageContent = JSON.stringify({
                message: String(data),
                ...(componentName && { component: componentName })
            }, null, 2);
        }

        // File log format (always JSON)
        const fileLogRecord = `[${levelName}] - [${timestamp}]: ${messageContent}\n`;
        
        // Enhanced console output for development
        if (this.config.isDevelopment) {
            this.outputToConsole(level, levelName, timestamp, messageContent, componentName);
        }
     
        this.queue.push(fileLogRecord);
        if (!this.ready) {
            return;
        }

        this.flushQueue();
    }

    /**
     * Enhanced console output with colors and better formatting
     */
    private outputToConsole(level: LogLevel, levelName: string, timestamp: string, message: string, component: string) {
        if (!this.config.enableColors) {
            console.log(`[${levelName}] ${timestamp} ${component ? `[${component}] ` : ''}${message}`);
            return;
        }

        const { colors } = this;
        let levelColor = colors.white;
        let levelSymbol = '•';

        switch (level) {
            case LogLevel.DEBUG:
                levelColor = colors.gray;
                levelSymbol = '◦';
                break;
            case LogLevel.INFO:
                levelColor = colors.blue;
                levelSymbol = 'ℹ';
                break;
            case LogLevel.WARNING:
                levelColor = colors.yellow;
                levelSymbol = '⚠';
                break;
            case LogLevel.ERROR:
                levelColor = colors.red;
                levelSymbol = '✖';
                break;
        }

        const timestampFormatted = `${colors.gray}${timestamp}${colors.reset}`;
        const levelFormatted = `${levelColor}${colors.bright}${levelSymbol} ${levelName}${colors.reset}`;
        const componentFormatted = component ? `${colors.cyan}[${component}]${colors.reset} ` : '';
        
        // Try to format JSON nicely for console
        let formattedMessage = message;
        try {
            const parsed = JSON.parse(message);
            if (parsed.message && typeof parsed.message === 'string') {
                // Simple message
                formattedMessage = parsed.message;
            } else {
                // Complex object - format with indentation
                formattedMessage = `\n${JSON.stringify(parsed, null, 2)}`;
            }
        } catch {
            // Not JSON, use as is
        }

        console.log(`${timestampFormatted} ${levelFormatted} ${componentFormatted}${formattedMessage}`);
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