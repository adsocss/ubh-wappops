import { consume } from "@lit/context";
import { LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { wappops, Wappops } from "../../application/wappops";

@customElement("ubh-component")
export default class UbhComponent extends LitElement {
    /**
     * Contexto de la aplicación.
     */
    @consume({ context: wappops })
    protected ctx!: Wappops;

    /**
     * Determina si el componente se está ejecutando en un dispositivo móvil.
     * @returns { boolean } true si el componente se está ejecutando en un dispositivo "móvil"
     *                           según el media query definido en mobileMq.
     */
    protected isMobile(): boolean {
        return isMobile()
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-component": UbhComponent;
    }
}

// Factores de forma
const mobileMq = '(max-width: 900px)';

// Funciones auxiliares para componentes que no heredan éste
export function isMobile() {
    return window.matchMedia(mobileMq).matches;
}