import { INotification } from "@model/data-model";
import { html, TemplateResult } from "lit";
import UbhList from "../base/ubh-list";
import { customElement } from "lit/decorators.js";
import "../notifications/ubh-task-notification-card";
import { elapsedHours } from "../../application/utils/datetimeutils";

@customElement('ubh-notifications-list')
export class UbhNotificationsList extends UbhList<INotification> {
    constructor() {
        super();
        this.selectable = false
        this.canSearch = false;
        this.canAdd = false;
        this.canReload = false;
        this.hasSettings = false;
    }

    protected load(): Promise<INotification[]> {
        return this.ctx.db.notifications
            .orderBy('timestamp')
            .filter((item: INotification) => elapsedHours(item.timestamp) < 24) // Por si la eliminación no se ha hecho
            .reverse()
            .toArray();
    }

    protected renderItem(item: INotification): TemplateResult {
        if (item.topic === 'tasks') {
            return html`
                <ubh-task-notification-card .value=${item}></ubh-task-notification-card>
            `;
        }

        return html``;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-notifications-list': UbhNotificationsList;
    }
}