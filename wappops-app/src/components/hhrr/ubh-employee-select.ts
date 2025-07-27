import { consume } from "@lit/context";
import { customElement, property } from "lit/decorators.js";
import { PropertyValues } from "lit";
import { UBHSelect, SelectOption } from "../base/ubh-select";
import { IEmployee, ICenter, IDepartment } from "@model/data-model";
import { wappops, Wappops } from "../../application/wappops";

@customElement('ubh-employee-select')
export class UbhEmployeeSelect extends UBHSelect<IEmployee> {
    @consume({ context: wappops })
    ctx!: Wappops;

    @property({type: Object})
    center: ICenter | undefined = undefined;
    @property({type: Object})
    department: IDepartment | undefined = undefined;

    protected getOptions(): Promise<IEmployee[]>;
    protected getOptions(): IEmployee[];
    protected getOptions(): IEmployee[] | Promise<IEmployee[]> {
        return this.ctx.db.employees
            .filter(e => e.id !== undefined && e.id !== null)
            .filter(e => this.center === undefined || e.center?.id === this.center?.id)
            .filter(e => this.department === undefined || e.department.id === this.department.id)
            .filter(e => e.fullName !== undefined)
            .sortBy('surname1');
    }

    protected mapToSelectOption(option: IEmployee): SelectOption {
        return {
            value: option?.id?.toString(),
            description: option?.fullName ?? 'Nombre desconocido'
        }
    }

    protected override matchesSearch(option: IEmployee, searchTerm: string): boolean {
        const term = (searchTerm ?? '').trim().toLocaleLowerCase();

        if (this.doesMatch(option.surname1, term)) return true;
        if (this.doesMatch(option.surname2, term)) return true;
        if (this.doesMatch(option.name, term)) return true;

        return false;
    }

    private doesMatch(namePart: string, searchTerm: string): boolean {
        return (namePart ?? '').trim().toLocaleLowerCase().startsWith(searchTerm); 
    }

    protected willUpdate(_changedProperties: PropertyValues): void {
        super.willUpdate(_changedProperties);
        if (this.center || this.department) {
            this.getOptions().then(options => this.options = options);
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-employee-select': UbhEmployeeSelect
    }
}