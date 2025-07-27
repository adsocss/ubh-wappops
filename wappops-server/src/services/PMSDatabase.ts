import { knex, type Knex } from "knex";
import { format } from "sql-formatter";
import type { IApplicationConfiguration } from "../application/config/IAplicationConfiguration";
import type { IDatabase } from "../application/db/IDatabase";
import { CenterRepository } from "../pms/database/centers/CenterRepository";
import { DepartmentRepository } from "../pms/database/hhrr/DepartmentRepository";
import { EmployeeRepository } from "../pms/database/hhrr/EmployeeRepository";
import { UserRepository } from "../pms/database/users/UserRepository";
import { BlockRespository } from "../pms/database/centers/BlockRepository";
import { FloorRespository } from "../pms/database/centers/FloorRepository";
import { RoomRangeRepository } from "../pms/database/housekeeping/RoomRangeRepository";
import { RoomRepository } from "../pms/database/centers/RoomRepository";
import { AssetRepository } from "../pms/database/maintenance/AssetRepository";
import { CounterRepository } from "../pms/database/maintenance/CounterRepository";
import { CounterRecordRepository } from "../pms/database/maintenance/CounterRecordRepository";
import { TaskTypeRepository } from "../pms/database/tasks/TaskTypeRepository";
import { LocationRepository } from "../pms/database/centers/LocationRespository";
import { TaskEnumRepository } from "../pms/database/tasks/TaskEnumRepository";
import { TaskDocumentRepository } from "../pms/database/tasks/TaskDocumentRepository";
import { TaskRepository } from "../pms/database/tasks/TaskRepository";
import { ReservationRepository } from "../pms/database/booking/ReservationRepository";
import { WorkTimeRepository } from "../pms/database/tasks/WorkTimeRepository";


export class PMSDatabase implements IDatabase {
    private appConfiguration: IApplicationConfiguration;
    private db: Knex;
    private debug =  false;
    private profile = false;

    // Instancias de repositorios
    readonly users = new UserRepository(this);
    readonly centers = new CenterRepository(this);
    readonly blocks = new BlockRespository(this);
    readonly floors = new FloorRespository(this);
    readonly rooms = new RoomRepository(this);
    readonly locations = new LocationRepository(this);

    readonly departments = new DepartmentRepository(this);
    readonly employees = new EmployeeRepository(this);
    
    readonly assets = new AssetRepository(this);
    readonly counters = new CounterRepository(this);
    readonly counters_records: CounterRecordRepository;

    readonly room_ranges = new RoomRangeRepository(this);

    readonly task_types = new TaskTypeRepository(this);
    readonly task_enums = new TaskEnumRepository(this);
    readonly work_times = new WorkTimeRepository(this);
    readonly tasks: TaskRepository;
    readonly task_documents = new TaskDocumentRepository(this);

    readonly booking = new ReservationRepository(this);

    /**
     * Constructor
     * @param { IApplicationConfiguration } configuration - Parámetros de configuración de la aplicación.
     */
    constructor(configuration: IApplicationConfiguration) {
        this.db = knex({
            client: 'mssql',
            connection: {
                server: configuration.pms.database.host,
                port: configuration.pms.database.port ?? 1433,
                database: configuration.pms.database.database,
                userName: configuration.pms.database.username,
                password: configuration.pms.database.password
            }
        });

        this.appConfiguration = configuration;
        this.counters_records = new CounterRecordRepository(this, this.appConfiguration.counters);
        this.tasks = new TaskRepository(this, configuration.tasks);
    }

    public setDebug(debug: boolean) {
        this.debug = debug;
    }

    public setProfile(profile: boolean) {
        this.profile = profile;
    }

    // TODO: revisar timeout de conexión vs query y requerimientos específicos de Sql Server
    public async status(): Promise<'ok' | 'failing'> {
        try {
            // Realiza una consulta simple para verificar la conexión
            await this.db.raw("SELECT 1").timeout(5000); // Timeout de 5 segundos
            return 'ok';
        } catch (error) {
            return 'failing';
        }
    }

    public async execute(statement: string): Promise<any[]> {

        if (this.debug) {
            console.log(format(statement, { language: 'transactsql' }));
        }

        const start = Date.now();
        const result: any[] = await this.db.raw(statement);

        if (this.profile) {
            console.log(`${result.length} fila${result.length !== 1 ? 's' : ''} en ${Date.now() - start}ms.`) 
        }

        return result;
    }
}