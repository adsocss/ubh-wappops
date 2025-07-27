import type { TaskStatusCode } from "../../pms/database/tasks/ITaskEnum";

export interface ITasksConfiguration {
    timespan: {
        status: TaskStatusCode,
        daysBefore: number;
    }[]
}