type ExceptionSeverityType = 'warning' | 'error' | 'fatal';

export class Exception {
    readonly severity: ExceptionSeverityType
    readonly message: string;
    readonly details?: string

    constructor(severity: ExceptionSeverityType, message: string, details?: string) {
        this.severity = severity;
        this.message = message;
        this.details = details;
    }
}
