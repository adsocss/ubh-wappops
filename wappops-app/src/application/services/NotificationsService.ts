import { DEFAULT_CLIENT_CONFIGURATION } from "../model/IClientConfiguration";
import { INotification, ISubscriptionMessage, ITask } from "../../../../wappops-server/src/model/data-model";
import { CLIENT_CONFIG_KEY } from "../local-storage-keys";
import { Wappops } from "../wappops";
import { remapTask } from "./synchronizer";
import { elapsedHours } from "../utils/datetimeutils";

export const EVT_NOTIFICATION = "ubh-notification";

export class NotificationsService {
    private ctx: Wappops;
    private wsConnection: WebSocket | undefined;
    private url: string;

    /**
     * Constructor del servicio de notificaciones.
     * @param { Wappops } ctx - Contexto de la aplicación.
     */
    constructor(ctx: Wappops) {
        console.log('🔔 [CLIENT] Initializing NotificationsService');
        
        // Handle empty API URL (when using Vite proxy in development)
        let apiUrl = ctx.apiUrl;
        if (!apiUrl) {
            // If API URL is empty (Vite proxy), use current window location for WebSocket
            apiUrl = window.location.origin;
        }
        
        const _apiUrl = new URL(apiUrl);
        const protocol = _apiUrl.protocol === "https:" ? "wss" : "ws";
        this.url = `${protocol}://${_apiUrl.host}`;
        
        console.log(`🔔 [CLIENT] WebSocket URL will be: ${this.url}`);
        console.log(`🔔 [CLIENT] API URL: ${apiUrl}`);
        console.log(`🔔 [CLIENT] Protocol: ${protocol}`);
        
        this.ctx = ctx;
        this.cleanUp();

        // Reconectar al WebSocket del servidor de notificaciones si se
        // ha perdido la conexión de red cuando ésta se recupera.
        window.addEventListener("online", () => {
            console.log('🔔 [CLIENT] Network came back online - attempting reconnection');
            this.reconnect();
        });
        
        console.log('🔔 [CLIENT] NotificationsService initialized');
    }

    /**
     * Determina si el WebSocket está conectado.
     * @returns { boolean } true si está conectado, false en caso contrario.
     */
    public get connected(): boolean {
        return this.wsConnection !== undefined && this.wsConnection.readyState === WebSocket.OPEN;
    }

    /**
     * Conecta el WebSocket al servidor de notificaciones.
     */
    public connect() {
        console.log(`🔔 [CLIENT] Attempting to connect WebSocket to: ${this.url}`);
        
        if (!this.wsConnection) {
            console.log('🔔 [CLIENT] Creating new WebSocket connection');
            this.wsConnection = new WebSocket(this.url);

            this.wsConnection.onopen = () => {
                console.log('🔔 [CLIENT] ✅ WebSocket connection opened successfully');
                this.subscribe();
            };

            this.wsConnection.onclose = (event) => {
                console.warn(`🔔 [CLIENT] ❌ WebSocket connection closed - Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`, new Date().toISOString());
                this.unsubscribe();
                this.wsConnection = undefined;
            };

            this.wsConnection.onerror = (error) => {
                console.error('🔔 [CLIENT] ❌ WebSocket error:', error);
            };

            this.wsConnection.onmessage = (event) => {
                console.log('🔔 [CLIENT] 📨 Received message:', event.data);
                try {
                    const notification: INotification = JSON.parse(event.data);
                    console.log('🔔 [CLIENT] 📨 Parsed notification:', notification);
                    this.handleNotification(notification);
                } catch (error) {
                    console.error('🔔 [CLIENT] ❌ Failed to parse notification message:', error);
                    console.error('🔔 [CLIENT] ❌ Raw message data:', event.data);
                }
            }
        } else {
            console.log('🔔 [CLIENT] WebSocket connection already exists, current state:', this.wsConnection.readyState);
        }
    }

    /**
     * Desconecta el WebSocket si está conectado.
     */
    public disconnect() {
        console.log('🔔 [CLIENT] Disconnecting WebSocket');
        if (this.wsConnection) {
            this.unsubscribe();
            this.wsConnection.close();
            console.log('🔔 [CLIENT] WebSocket disconnected');
        } else {
            console.log('🔔 [CLIENT] No WebSocket connection to disconnect');
        }
    }

    /**
     * Reconecta el WebSocket al servidor de notificaciones
     * si se ha desconectado.
     */
    private reconnect() {
        console.log("🔔 [CLIENT] Attempting to reconnect to notifications service...");

        if (!this.connected) {
            console.log("🔔 [CLIENT] WebSocket not connected, initiating reconnection");
            this.disconnect();
            this.connect();
        } else {
            console.log("🔔 [CLIENT] WebSocket already connected, no reconnection needed");
        }
    }

    /*
     * Suscribir al servicio del servidor
     * Los canales a los que se suscribe el usuario se determinan en el servidor
     * en función de sus roles.
     */
    private subscribe() {
        console.log('🔔 [CLIENT] Attempting to subscribe to notifications');
        
        if (!(this.connected && this.ctx.currentUser)) {
            console.warn('🔔 [CLIENT] ❌ Cannot subscribe - WebSocket not connected or no current user');
            console.log('🔔 [CLIENT] - Connected:', this.connected);
            console.log('🔔 [CLIENT] - Current user:', !!this.ctx.currentUser);
            return;
        }

        const subscriptionMessage: ISubscriptionMessage = {
            type: "subscribe",
            user: this.ctx.currentUser,
        };
        
        console.log('🔔 [CLIENT] Sending subscription message:', subscriptionMessage);
        this.wsConnection?.send(JSON.stringify(subscriptionMessage));
        console.log('🔔 [CLIENT] ✅ Subscription message sent');
    }

    /**
     * Cancela las suscripciones del usuario en el servicio del servidor.
     */
    private unsubscribe() {
        console.log('🔔 [CLIENT] Attempting to unsubscribe from notifications');
        
        if (!(this.connected && this.ctx.currentUser)) {
            console.log('🔔 [CLIENT] Cannot unsubscribe - WebSocket not connected or no current user');
            return;
        }

        const unsubscriptionMessage: ISubscriptionMessage = {
            type: "unsubscribe",
            user: this.ctx.currentUser,
        };
        
        console.log('🔔 [CLIENT] Sending unsubscription message:', unsubscriptionMessage);
        this.wsConnection?.send(JSON.stringify(unsubscriptionMessage));
        console.log('🔔 [CLIENT] ✅ Unsubscription message sent');
    }

    /* Tratar notificación seleccionando la acción ulterior en función de su tipo (topic) */
    private handleNotification(notification: INotification) {
        console.log('🔔 [CLIENT] 📬 Handling notification:', notification);
        
        notification.timestamp = new Date(notification.timestamp || Date.now());
        
        switch (notification.topic) {
            case "tasks":
                console.log('🔔 [CLIENT] 📋 Processing task notification');
                this.handleTaskNotification(notification);
                break;
            default: 
                console.warn('🔔 [CLIENT] ❓ Unknown notification topic:', notification.topic);
                break; // Ignorar
        }
    }

    /* Tratar notificación de tarea */
    private async handleTaskNotification(notification: INotification) {
        console.log('🔔 [CLIENT] 📋 Processing task notification:', notification);
        
        const task = remapTask(notification.data as ITask);
        console.log('🔔 [CLIENT] 📋 Remapped task:', task);

        if (task && task.id) {
            console.log('🔔 [CLIENT] 📋 Looking for existing task with ID:', task.id);
            const localTask = await this.ctx.db.tasks.get({ id: task.id });
            
            if (localTask) {
                console.log('🔔 [CLIENT] 📋 ✅ Found existing task, updating:', localTask);
                notification.description = 'Tarea modificada';
                await this.ctx.db.tasks.update(localTask.localId, task);
                console.log('🔔 [CLIENT] 📋 ✅ Task updated in local database');
            } else {
                console.log('🔔 [CLIENT] 📋 ➕ New task, adding to database');
                notification.description = 'Nueva tarea';
                await this.ctx.db.tasks.add(task);
                console.log('🔔 [CLIENT] 📋 ✅ New task added to local database');
            }

            console.log('🔔 [CLIENT] 📋 Saving notification to database');
            await this.ctx.db.notifications.put(notification);
            
            console.log('🔔 [CLIENT] 📋 Dispatching notification event');
            document.dispatchEvent(new Event(EVT_NOTIFICATION, { bubbles: true, composed: true }));

            // Alerta de sonido y/o vibración (actualizar antes desde LocalStorage)
            const lsConfig = localStorage.getItem(CLIENT_CONFIG_KEY);
            this.ctx.configuration = lsConfig ? JSON.parse(lsConfig) : DEFAULT_CLIENT_CONFIGURATION;

            if (this.mustAlert(notification)) {
                console.log('🔔 [CLIENT] 🔊 Playing alert for notification');
                this.playAlert();
            } else {
                console.log('🔔 [CLIENT] 🔇 Alert filtered out by user preferences');
            }
        } else {
            console.warn('🔔 [CLIENT] ❌ Invalid task data in notification:', task);
        }
    }

    /*
     * Determina si se debe ejecutar la alerta de sonido y/o vibración según
     * la configuración del usuario y el departamento de la notificación.
    */
    private mustAlert(notification: INotification): boolean {
        // Filtrar notificaciones según la configuración de departamentos
        const cfg = this.ctx.configuration.preferences.notifications;

        // Si no hay departamentos seleccionados, seleccionar todas las notificaciones
        if ((cfg.departments ?? []).length === 0) {
            return true;
        }

        const department = (notification.data as ITask).department;
        // Si el departamento de la notificación está en la lista de departamentos seleccionados
        if (department && cfg.departments.some(d => d.id === department.id)) {
            return true;
        }
        // Si no hay departamento en la notificación, se considera que NO es relevante
        return false;
    }

    // Reproducir alerta de notificación
    private async playAlert() {
        console.log('🔔 [CLIENT] 🔊 Starting notification alert');
        const repeat = this.ctx.configuration.preferences.notifications.sound.repeat || 1;
        console.log('🔔 [CLIENT] 🔊 Alert repeat count:', repeat);
        
        for (let i = 0; i < repeat; i++) {
            console.log('🔔 [CLIENT] 🔊 Playing alert tone', i + 1, 'of', repeat);
            await new Promise(res => setTimeout(res, 1000));
            this.playAlertTone();
        }
        console.log('🔔 [CLIENT] 🔊 ✅ Notification alert completed');
    }

    // Reproducir tono de alerta
    private playAlertTone() {
        console.log('🔔 [CLIENT] 🔊 Playing alert tone');
        const cfg = this.ctx.configuration.preferences.notifications;
        console.log('🔔 [CLIENT] 🔊 Sound config:', cfg.sound);
        console.log('🔔 [CLIENT] 🔊 Vibration config:', cfg.vibration);

        if (cfg.vibration === 'enabled') {
            console.log('🔔 [CLIENT] 📱 Triggering vibration (500ms)');
            try {
                navigator.vibrate(500); // Vibración de 500 ms
                console.log('🔔 [CLIENT] 📱 ✅ Vibration triggered');
            } catch (err) {
                console.warn('🔔 [CLIENT] 📱 ❌ Failed to trigger vibration:', err);
            }
        }

        if (!cfg.sound.enabled) {
            console.log('🔔 [CLIENT] 🔊 Sound disabled, skipping audio');
            return; // Si el sonido no está habilitado, volver sin reproducirlo
        }

        console.log('🔔 [CLIENT] 🔊 Creating audio context');
        try {
            const actx = new AudioContext();
            const osc = actx.createOscillator();
            const gainNode = actx.createGain();
            gainNode.gain.setValueAtTime(cfg.sound.volume, actx.currentTime);
            console.log('🔔 [CLIENT] 🔊 Volume set to:', cfg.sound.volume);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, actx.currentTime);
            osc.frequency.setValueAtTime(440, actx.currentTime + 0.2);
            osc.frequency.setValueAtTime(880, actx.currentTime + 0.8);

            osc.connect(gainNode);
            gainNode.connect(actx.destination);

            osc.start();
            osc.stop(actx.currentTime + 0.5);
            console.log('🔔 [CLIENT] 🔊 ✅ Audio tone played');
        } catch (err) {
            console.warn('🔔 [CLIENT] 🔊 ❌ Failed to play audio tone:', err);
        }
    }

    /**
     * Limpia las notificaciones antiguas de la base de datos.
     * Elimina las notificaciones que tienen más de 24 horas.
     */
    private cleanUp() {
        console.log('🔔 [CLIENT] 🧹 Starting notification cleanup');
        try {
            this.ctx.db.notifications
                .filter((item: INotification) => elapsedHours(item.timestamp) > 24)
                .delete();
            console.log('🔔 [CLIENT] 🧹 ✅ Cleanup completed, deleted old notifications');
        } catch (err) {
            console.warn('🔔 [CLIENT] 🧹 ❌ Error during cleanup:', err);
        }
    }
}