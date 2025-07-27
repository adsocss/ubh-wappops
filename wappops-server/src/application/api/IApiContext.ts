import type { GuestAPIClient } from "../../services/GuestAPIClient";
import type Logger from "../../services/logger";
import type { PMSDatabase } from "../../services/PMSDatabase";
import type { IApplicationConfiguration } from "../config/IAplicationConfiguration";

export interface IApiContext {
    configuration: IApplicationConfiguration
    services: {
        pmsDatabase: PMSDatabase
        pmsAPIClient: GuestAPIClient
        logger: Logger
    }
}