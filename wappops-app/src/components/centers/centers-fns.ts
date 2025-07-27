import { ICenter } from "@model/data-model";
import { Wappops } from "../../application/wappops";

/**
 * Devuelve los centros operativos (excluye Central y establecimientos dependientes)
 * @param { Wappops } ctx - Contexto de la aplicación
 * @returns { Promise<ICenter[]> } - Lista de centros ordenados por código.
 */
export async function getOperationsCenters(ctx: Wappops): Promise<ICenter[]> {
    const centers = (await ctx.db.employees
        .filter(e => e.center.code !== 'CENTRAL')
        .toArray())
        .map(e => e.center);

    centers.sort((a,b) => {
        if (a.code < b.code) return -1;
        if (a.code > b.code) return 1;
        return 0;
    });
    
    return centers;
}