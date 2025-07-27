import type { IAPIConfiguration } from "./IAPIConfiguration";
import type { ICountersConfiguration } from "./ICountersConfiguration";
import type { IDatabaseConfiguration } from "./IDatabaseConfiguration";
import type { ISecurityConfiguration } from "./ISecurityConfiguration";
import type { IServerConfiguration } from "./IServerConfiguration";
import type { ITasksConfiguration } from "./ITasksConfiguration";
import type { IWSConfiguration } from "./IWSConfiguration";

export interface IApplicationConfiguration {
    server: IServerConfiguration
    security: ISecurityConfiguration
    pms: {
        database: IDatabaseConfiguration
        api: IAPIConfiguration
        ws: IWSConfiguration[]
    }
    tasks: ITasksConfiguration
    counters: ICountersConfiguration    
}