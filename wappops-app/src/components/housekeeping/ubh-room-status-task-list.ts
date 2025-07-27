import { customElement, property } from "lit/decorators.js";
import { IRoom, ITask } from "@model/data-model";
import UbhTasksList from "../tasks/ubh-tasks-list";


@customElement('ubh-room-status-task-list')
export class UbhRoomStatusTaskList extends UbhTasksList {
    @property({ type: Object  })    
    room: IRoom | undefined = undefined;    

    protected override async load(): Promise<ITask[]> {
        if (!this.room) {
            return [];
        }

        return this.ctx.db.tasks
            .filter(task => task.targetType.code === 'room')
            .filter(task => task.taskTarget?.id === this.room?.id)
            .toArray();
    }   
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-room-status-task-list': UbhRoomStatusTaskList;
    }
}