export interface ISecurityConfiguration {
    secret: string
    tokensDuration?: number
    implicitDomains?: string[]
    tls?: {
        certificateFile: string
        privateKeyFile: string
    }
}