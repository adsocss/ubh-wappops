export interface IWSConfiguration {
    topic: 'tasks'| 'booking' | 'rooms';
    host: string;
    username: string;
    password: string;   
}