import { resetStyles } from "../css/reset.css";
import UbhComponent from "../base/ubh-component";
import { notificationsIcon } from "../common/icons";
import { css, html, nothing, PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";
import { iconStyles } from "../css/icons.css";
import { liveQuery } from "dexie";

@customElement('ubh-notifications-alert')
export class UbhNotificationsAlert extends UbhComponent {
    private query = liveQuery(() => {
        return this.ctx.db.notifications
            .filter((notification) => !notification.read)
            .count();
    });


    @state()
    private _unreadCount: number = 0;


    /* Visualizar */
    protected render() {
        const displayCount = this._unreadCount > 100 ? '+100' : this._unreadCount.toString();

        return html`
            <div id="wrapper">
                <div class="icon-button toolbar">${notificationsIcon}</div>
                ${this._unreadCount === 0 
                    ? nothing
                    : html`
                        <sl-badge id="unread-count" pill>
                            ${displayCount}
                        </sl-badge>
                    `
                }
            </div>
        `;
    }

    connectedCallback(): void {
        super.connectedCallback();
        // Suscribirse a los cambios en el contador de notificaciones no leídas
        this.query.subscribe((count) => {
            this._unreadCount = count;
            this.requestUpdate();
        });
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        this.updateCount();
    }

    /**
     * Actualiza el contador de notificaciones no leídas.
     */
    public updateCount() {
        this.ctx.db.notifications
            .filter((notification) => !notification.read)
            .count()
            .then(count => {
                this._unreadCount = count;
                this.requestUpdate();
            });
    }

    // Estilos CSS específicos de este componente
    static componentStyles = css`
        #wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--sl-spacing-x-small);
            margin-left: var(--sl-spacing-x-small);
            margin-right: var(--sl-spacing-x-small);
            cursor: pointer;
        }
    `;

    static styles = [resetStyles, iconStyles, UbhNotificationsAlert.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-notifications-alert': UbhNotificationsAlert;
    }
}