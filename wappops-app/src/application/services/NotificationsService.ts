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
        // Handle empty API URL (when using Vite proxy in development)
        let apiUrl = ctx.apiUrl;
        if (!apiUrl) {
            // If API URL is empty (Vite proxy), use current window location for WebSocket
            apiUrl = window.location.origin;
        }
        
        const _apiUrl = new URL(apiUrl);
        const protocol = _apiUrl.protocol === "https:" ? "wss" : "ws";
        this.url = `${protocol}://${_apiUrl.host}`;
        this.ctx = ctx;
        this.cleanUp();

        // Reconectar al WebSocket del servidor de notificaciones si se
        // ha perdido la conexión de red cuando ésta se recupera.
        window.addEventListener("online", () => {
            this.reconnect();
        });
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
        if (!this.wsConnection) {
            this.wsConnection = new WebSocket(this.url);

            this.wsConnection.onopen = () => {
                this.subscribe();
            };

            this.wsConnection.onclose = () => {
                this.unsubscribe();
                console.warn("Conexión al servidor de notificaciones cerrada.", new Date().toISOString());
                this.wsConnection = undefined;
            };

            this.wsConnection.onmessage = (event) => {
                try {
                    const notification: INotification = JSON.parse(event.data);
                    this.handleNotification(notification);
                } catch (_error) {
                    // Ignorar si el mensaje no es un JSON válido
                }
            }
        }
    }

    /**
     * Desconecta el WebSocket si está conectado.
     */
    public disconnect() {
        if (this.wsConnection) {
            this.unsubscribe();
            this.wsConnection.close();
        }
    }

    /**
     * Reconecta el WebSocket al servidor de notificaciones
     * si se ha desconectado.
     */
    private reconnect() {

        console.log("Reconectando al servicio de notificaciones...");

        if (!this.connected) {
            this.disconnect();
            this.connect();
        }
    }

    /*
     * Suscribir al servicio del servidor
     * Los canales a los que se suscribe el usuario se determinan en el servidor
     * en función de sus roles.
     */
    private subscribe() {
        if (!(this.connected && this.ctx.currentUser)) {
            return;
        }

        const subscriptionMessage: ISubscriptionMessage = {
            type: "subscribe",
            user: this.ctx.currentUser,
        };
        this.wsConnection?.send(JSON.stringify(subscriptionMessage));
    }

    /**
     * Cancela las suscripciones del usuario en el servicio del servidor.
     */
    private unsubscribe() {
        if (!(this.connected && this.ctx.currentUser)) {
            return;
        }

        const unsubscriptionMessage: ISubscriptionMessage = {
            type: "unsubscribe",
            user: this.ctx.currentUser,
        };
        this.wsConnection?.send(JSON.stringify(unsubscriptionMessage));
    }

    /* Tratar notificación seleccionando la acción ulterior en función de su tipo (topic) */
    private handleNotification(notification: INotification) {
        notification.timestamp = new Date(notification.timestamp || Date.now());
        switch (notification.topic) {
            case "tasks":
                this.handleTaskNotification(notification);
                break;
            default: break; // Ignorar
        }
    }

    /* Tratar notificación de tarea */
    private async handleTaskNotification(notification: INotification) {
        const task = remapTask(notification.data as ITask);

        if (task && task.id) {
            const localTask = await this.ctx.db.tasks.get({ id: task.id });
            if (localTask) {
                notification.description = 'Tarea modificada';
                await this.ctx.db.tasks.update(localTask.localId, task);
            } else {
                notification.description = 'Nueva tarea';
                await this.ctx.db.tasks.add(task);
            }

            await this.ctx.db.notifications.put(notification);
            document.dispatchEvent(new Event(EVT_NOTIFICATION, { bubbles: true, composed: true }));

            // Alerta de sonido y/o vibración (actualizar antes desde LocalStorage)
            const lsConfig = localStorage.getItem(CLIENT_CONFIG_KEY);
            this.ctx.configuration = lsConfig ? JSON.parse(lsConfig) : DEFAULT_CLIENT_CONFIGURATION;

            if (this.mustAlert(notification)) {
                this.playAlert();
            }
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
        const repeat = this.ctx.configuration.preferences.notifications.sound.repeat || 1;
        for (let i = 0; i < repeat; i++) {
            await new Promise(res => setTimeout(res, 1000));
            this.playAlertTone();
        }
    }

    // Reproducir tono de alerta
    private playAlertTone() {
        const cfg = this.ctx.configuration.preferences.notifications;

        if (cfg.vibration === 'enabled') {
            navigator.vibrate(500); // Vibración de 500 ms
        }

        if (!cfg.sound.enabled) {
            return; // Si el sonido no está habilitado, volver sin reproducirlo
        }

        const actx = new AudioContext();
        const osc = actx.createOscillator();
        const gainNode = actx.createGain();
        gainNode.gain.setValueAtTime(cfg.sound.volume, actx.currentTime);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, actx.currentTime);
        osc.frequency.setValueAtTime(440, actx.currentTime + 0.2);
        osc.frequency.setValueAtTime(880, actx.currentTime + 0.8);

        osc.connect(gainNode);
        gainNode.connect(actx.destination);

        osc.start();
        osc.stop(actx.currentTime + 0.5);
    }

    /**
     * Limpia las notificaciones antiguas de la base de datos.
     * Elimina las notificaciones que tienen más de 24 horas.
     */
    private cleanUp() {
        this.ctx.db.notifications
            .filter((item: INotification) => elapsedHours(item.timestamp) > 24)
            .delete();
    }
}