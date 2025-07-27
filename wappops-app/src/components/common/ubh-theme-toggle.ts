import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { resetStyles } from "../css/reset.css";
import { moonIcon, sunIcon } from "./icons";

/**
 * Componente para alternar entre temas claro y oscuro.
 */
@customElement('ubh-theme-toggle')
export default class UbhThemeToggle extends LitElement {

    private toggleTheme() {
        const current = this.getCurrenTheme();
        const html = document.querySelector('html');
        html?.classList.remove(current === 'light' ? 'sl-theme-light' : 'sl-theme-dark');
        html?.classList.add(current === 'light' ? 'sl-theme-dark' : 'sl-theme-light');
        this.requestUpdate();
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }

    private getCurrenTheme(): string {
        return document.querySelector('html')?.classList.contains('sl-theme-dark') ? 'dark' : 'light';
    }

    protected render() {
        return html`
            <div id="toggle-icon" @click=${this.toggleTheme}>
                ${this.getCurrenTheme() === 'light' ? moonIcon : sunIcon}
            </div>
        `;
    }

    // Estilos CSS específicos de este componente
    static componentStyles = css`
        #toggle-icon > svg { 
            cursor: pointer;
            fill: var(--sl-color-neutral-1000);
        }
       `;

    static styles = [resetStyles, UbhThemeToggle.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-theme-toggle": UbhThemeToggle;
    }
}