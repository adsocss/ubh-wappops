import { Console } from "console";
import { EventEmitter } from "events";

/**
 * Implementación alternativa (cortesía de GitHub Copilot) de cliente de SignalR
 * utilizando WebSockets nativos de Bun. Esta implementación es más ligera y evita
 * dependencias externas como @microsoft/signalr, que produce errores que solo 
 * aparecen en tiempo de ejecución debidos a la carga dinámica y condicional de
 * módulos que hace internamente (irresolube en Bun, AFAIK).
 */

/**
 * SignalR connection states
 */
export enum ConnectionState {
    Disconnected = "Disconnected",
    Connecting = "Connecting", 
    Connected = "Connected",
    Disconnecting = "Disconnecting",
    Reconnecting = "Reconnecting"
}

/**
 * SignalR message types
 */
enum MessageType {
    Invocation = 1,
    StreamItem = 2,
    Completion = 3,
    StreamInvocation = 4,
    CancelInvocation = 5,
    Ping = 6,
    Close = 7
}

/**
 * SignalR protocol message
 */
interface HubMessage {
    type: MessageType;
    target?: string;
    arguments?: any[];
    invocationId?: string;
    error?: string;
}

/**
 * Options for hub connection
 */
export interface HubConnectionOptions {
    accessTokenFactory?: () => Promise<string>;
    reconnectIntervals?: number[];
    pingInterval?: number;
    pingTimeout?: number;
    debug?: boolean;
}

/**
 * Custom SignalR Hub Connection implementation using Bun's native WebSocket
 */
export class BunHubConnection extends EventEmitter {
    private ws: WebSocket | null = null;
    private url: string;
    private options: HubConnectionOptions;
    private state: ConnectionState = ConnectionState.Disconnected;
    private invocationId: number = 0;
    private pendingInvocations: Map<string, { resolve: Function; reject: Function }> = new Map();
    private reconnectAttempts: number = 0;
    private pingTimer: Timer | null = null;
    private reconnectTimer: Timer | null = null;
    private messageHandlers: Map<string, Function[]> = new Map();
    private lastPingTime: number = 0;
    private pingTimeoutTimer: Timer | null = null;

    constructor(url: string, options: HubConnectionOptions = {}) {
        super();
        this.url = url;
        this.options = {
            reconnectIntervals: [0, 2000, 10000, 30000],
            pingInterval: 15000,
            pingTimeout: 30000,
            debug: false,
            ...options
        };
    }

    /**
     * Debug logging - only logs when debug option is enabled
     */
    private debugLog(message: string, ...args: any[]): void {
        if (this.options.debug) {
            console.log(`[SignalR Debug] ${message}`, ...args);
        }
    }

    /**
     * Start the connection
     */
    async start(): Promise<void> {
        if (this.state !== ConnectionState.Disconnected) {
            throw new Error(`Cannot start connection in state: ${this.state}`);
        }

        // Reset reconnection attempts when manually starting
        this.resetReconnectionAttempts();
        return this.connect();
    }

    /**
     * Reset reconnection attempts counter
     */
    public resetReconnectionAttempts(): void {
        this.reconnectAttempts = 0;
        this.debugLog('Reconnection attempts counter reset');
    }

    /**
     * Stop the connection
     */
    async stop(): Promise<void> {
        if (this.state === ConnectionState.Disconnected) {
            return;
        }

        this.state = ConnectionState.Disconnecting;
        this.clearTimers();
        
        if (this.ws) {
            this.ws.close(1000, "Connection stopped by client");
        }
        
        this.state = ConnectionState.Disconnected;
        this.emit('disconnected');
    }

    /**
     * Register handler for hub method
     */
    on(methodName: string, handler: (...args: any[]) => void): this {
        if (!this.messageHandlers.has(methodName)) {
            this.messageHandlers.set(methodName, []);
        }
        this.messageHandlers.get(methodName)!.push(handler);
        super.on(methodName, handler);
        return this;
    }

    /**
     * Unregister handler for hub method
     */
    off(methodName: string, handler?: (...args: any[]) => void): this {
        if (handler) {
            const handlers = this.messageHandlers.get(methodName);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index !== -1) {
                    handlers.splice(index, 1);
                }
            }
            super.off(methodName, handler);
        } else {
            this.messageHandlers.delete(methodName);
            super.removeAllListeners(methodName);
        }
        return this;
    }

    /**
     * Invoke hub method
     */
    async invoke(methodName: string, ...args: any[]): Promise<any> {
        if (this.state !== ConnectionState.Connected) {
            throw new Error(`Cannot invoke method when connection is ${this.state}`);
        }

        const invocationId = (++this.invocationId).toString();
        const message: HubMessage = {
            type: MessageType.Invocation,
            invocationId,
            target: methodName,
            arguments: args
        };

        return new Promise((resolve, reject) => {
            this.pendingInvocations.set(invocationId, { resolve, reject });
            this.sendMessage(message);
        });
    }

    /**
     * Send message without expecting response
     */
    send(methodName: string, ...args: any[]): void {
        if (this.state !== ConnectionState.Connected) {
            throw new Error(`Cannot send message when connection is ${this.state}`);
        }

        const message: HubMessage = {
            type: MessageType.Invocation,
            target: methodName,
            arguments: args
        };

        this.sendMessage(message);
    }

    /**
     * Get current connection state
     */
    getState(): ConnectionState {
        return this.state;
    }

    /**
     * Establish WebSocket connection
     */
    private async connect(): Promise<void> {
        this.state = ConnectionState.Connecting;
        this.emit('connecting');

        try {
            // Clean up any existing WebSocket connection
            if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
                this.ws.close();
                this.ws = null;
            }

            // Build WebSocket URL with negotiation
            const wsUrl = await this.negotiateConnection();
            
            this.debugLog('Creating WebSocket connection to:', wsUrl);
            
            // Create WebSocket connection
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                this.debugLog('WebSocket connection opened successfully');
                this.state = ConnectionState.Connected;
                this.reconnectAttempts = 0;
                
                // Send SignalR handshake message
                const handshake = JSON.stringify({ protocol: "json", version: 1 }) + '\x1e';
                this.ws!.send(handshake);
                this.debugLog('Sent SignalR handshake:', handshake);
                
                this.startPing();
                this.emit('connected');
                console.log('SignalR connection established');
            };

            this.ws.onmessage = (event) => {
                this.debugLog('Received SignalR message:', event.data);
                this.handleMessage(event.data);
            };

            this.ws.onclose = (event) => {
                this.debugLog('WebSocket closed:', event.code, event.reason);
                this.handleClose(event);
            };

            this.ws.onerror = (error) => {
                console.error('SignalR WebSocket error:', error);
                this.emit('error', error);
            };

        } catch (error) {
            console.error('Failed to establish SignalR connection:', error);
            this.state = ConnectionState.Disconnected;
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Negotiate connection with SignalR hub
     */
    private async negotiateConnection(): Promise<string> {
        const negotiateUrl = this.url.replace(/\/$/, '') + '/negotiate?negotiateVersion=1';
        
        this.debugLog('Starting SignalR negotiation with:', negotiateUrl);
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        // Add authorization if provided
        if (this.options.accessTokenFactory) {
            try {
                const token = await this.options.accessTokenFactory();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                    this.debugLog('Added authorization token to negotiation');
                }
            } catch (error) {
                console.error('Error getting access token:', error);
                throw error;
            }
        }

        try {
            const response = await fetch(negotiateUrl, {
                method: 'POST',
                headers
            });

            this.debugLog('Negotiation response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('SignalR negotiation failed:', response.status, errorText);
                throw new Error(`Negotiation failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const negotiateResponse = await response.json() as any;
            this.debugLog('Negotiation response:', negotiateResponse);
            
            if (negotiateResponse.error) {
                console.error('SignalR negotiation error:', negotiateResponse.error);
                throw new Error(`Negotiation failed: ${negotiateResponse.error}`);
            }

            // Build WebSocket URL
            const connectionToken = negotiateResponse.connectionToken;
            if (!connectionToken) {
                console.error('No connection token received from SignalR server');
                throw new Error('No connection token received from server');
            }
            
            let wsUrl = this.url.replace(/^http/, 'ws') + 
                       `?id=${encodeURIComponent(connectionToken)}`;
            
            // Add access token as URL parameter if available
            if (this.options.accessTokenFactory) {
                try {
                    // Get a fresh token for WebSocket connection (Microsoft SignalR does this)
                    const token = await this.options.accessTokenFactory();
                    if (token) {
                        wsUrl += `&access_token=${encodeURIComponent(token)}`;
                        this.debugLog('Added access token to WebSocket URL');
                    }
                } catch (error) {
                    console.error('Error getting access token for URL:', error);
                }
            }
            
            this.debugLog('WebSocket URL:', wsUrl);
            return wsUrl;
            
        } catch (error) {
            console.error('Error during negotiation:', error);
            throw error;
        }
    }

    /**
     * Handle incoming WebSocket message
     */
    private handleMessage(data: string): void {
        try {
            // SignalR messages are separated by \x1e character
            const messages = data.split('\x1e').filter(msg => msg.length > 0);

            for (const messageData of messages) {
                const message: HubMessage = JSON.parse(messageData);
                this.processMessage(message);
            }
        } catch (error) {
            console.error('Error processing SignalR message:', error);
        }
    }

    /**
     * Process individual SignalR message
     */
    private processMessage(message: HubMessage): void {
        switch (message.type) {
            case MessageType.Invocation:
                // Server calling client method
                if (message.target && message.arguments) {
                    this.emit(message.target, ...message.arguments);
                }
                break;

            case MessageType.Completion:
                // Response to client invocation
                if (message.invocationId) {
                    const pending = this.pendingInvocations.get(message.invocationId);
                    if (pending) {
                        this.pendingInvocations.delete(message.invocationId);
                        if (message.error) {
                            pending.reject(new Error(message.error));
                        } else {
                            pending.resolve(message.arguments?.[0]);
                        }
                    }
                }
                break;

            case MessageType.Ping:
                // This is a ping from server, send pong response
                this.debugLog('Received ping from server, sending pong');
                this.sendMessage({ type: MessageType.Ping });
                // Also treat this as a pong to our own ping (bidirectional keep-alive)
                this.handlePong();
                break;

            case MessageType.Close:
                // Server closing connection
                this.ws?.close();
                break;
        }
    }

    /**
     * Send message to server
     */
    private sendMessage(message: HubMessage): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const messageJson = JSON.stringify(message) + '\x1e';
            this.ws.send(messageJson);
        }
    }

    /**
     * Handle WebSocket close event
     */
    private handleClose(event: CloseEvent): void {
        this.debugLog(`SignalR connection closed: code=${event.code}, reason="${event.reason}", wasClean=${event.wasClean}`);
        this.clearTimers();
        
        if (this.state === ConnectionState.Disconnecting) {
            this.state = ConnectionState.Disconnected;
            this.emit('disconnected');
            return;
        }

        this.state = ConnectionState.Disconnected;
        this.emit('disconnected');

        // Attempt reconnection if configured
        if (this.options.reconnectIntervals && this.reconnectAttempts < this.options.reconnectIntervals.length) {
            const delay = this.options.reconnectIntervals[this.reconnectAttempts];
            this.reconnectAttempts++;
            
            console.log(`SignalR reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
            this.emit('reconnecting');
            
            this.reconnectTimer = setTimeout(() => {
                this.state = ConnectionState.Reconnecting;
                this.connect().catch((error) => {
                    console.error('SignalR reconnection failed:', error);
                    // Reconnection failed, will try again
                    this.handleClose(event);
                });
            }, delay);
        } else {
            console.log('SignalR max reconnection attempts reached');
            this.emit('reconnectionExhausted');
        }
    }

    /**
     * Start ping timer
     */
    private startPing(): void {
        if (this.options.pingInterval && this.options.pingInterval > 0) {
            this.debugLog(`Starting ping timer with interval: ${this.options.pingInterval}ms`);
            this.pingTimer = setInterval(() => {
                if (this.state === ConnectionState.Connected) {
                    this.sendPing();
                }
            }, this.options.pingInterval);
        }
    }

    /**
     * Send ping and start timeout monitoring
     */
    private sendPing(): void {
        this.lastPingTime = Date.now();
        this.debugLog('Sending ping to server');
        this.sendMessage({ type: MessageType.Ping });
        
        // Start ping timeout monitoring
        if (this.options.pingTimeout && this.options.pingTimeout > 0) {
            this.pingTimeoutTimer = setTimeout(() => {
                this.debugLog('Ping timeout detected - connection may be dead');
                console.warn('SignalR ping timeout - forcing reconnection');
                this.handlePingTimeout();
            }, this.options.pingTimeout);
        }
    }

    /**
     * Handle ping timeout - indicates connection is likely dead
     */
    private handlePingTimeout(): void {
        this.debugLog('Ping timeout occurred, forcing disconnection');
        if (this.ws) {
            this.ws.close(1000, 'Ping timeout');
        }
    }

    /**
     * Handle received pong from server
     */
    private handlePong(): void {
        const now = Date.now();
        const latency = now - this.lastPingTime;
        this.debugLog(`Received pong from server, latency: ${latency}ms`);
        
        // Clear ping timeout
        if (this.pingTimeoutTimer) {
            clearTimeout(this.pingTimeoutTimer);
            this.pingTimeoutTimer = null;
        }
    }

    /**
     * Clear all timers
     */
    private clearTimers(): void {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        if (this.pingTimeoutTimer) {
            clearTimeout(this.pingTimeoutTimer);
            this.pingTimeoutTimer = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}

/**
 * Builder for BunHubConnection
 */
export class BunHubConnectionBuilder {
    private url: string = '';
    private options: HubConnectionOptions = {};

    withUrl(url: string, options?: { accessTokenFactory?: () => Promise<string> }): this {
        this.url = url;
        if (options?.accessTokenFactory) {
            this.options.accessTokenFactory = options.accessTokenFactory;
        }
        return this;
    }

    withAutomaticReconnect(reconnectIntervals?: number[]): this {
        this.options.reconnectIntervals = reconnectIntervals || [0, 2000, 10000, 30000];
        return this;
    }

    configureLogging(logLevel: any): this {
        // For compatibility - enable debug mode for any logging configuration
        this.options.debug = true;
        return this;
    }

    /**
     * Enable or disable debug logging
     */
    withDebug(enabled: boolean = true): this {
        this.options.debug = enabled;
        return this;
    }

    /**
     * Configure ping interval for keep-alive (in milliseconds)
     */
    withPingInterval(intervalMs: number): this {
        this.options.pingInterval = intervalMs;
        return this;
    }

    /**
     * Configure ping timeout for disconnection detection (in milliseconds)
     */
    withPingTimeout(timeoutMs: number): this {
        this.options.pingTimeout = timeoutMs;
        return this;
    }

    build(): BunHubConnection {
        if (!this.url) {
            throw new Error('URL is required');
        }
        return new BunHubConnection(this.url, this.options);
    }
}
