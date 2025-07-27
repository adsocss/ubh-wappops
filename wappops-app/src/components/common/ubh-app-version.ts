import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { version } from "../../../package.json";
// import { resetStyles } from "@components/css/reset.css";
import { resetStyles } from "../css/reset.css";

/**
 * Componente que muestra la versión de la aplicación.
 * 
 * @element ubh-app-version
 */
@customElement('ubh-app-version')
export default class UbhAppVersion extends LitElement {
    protected render() {
        return html`
            <div id="wrapper">
                <span id="version">Versión ${version}</span>
                <span id="copyright">© Universal Beach Hotels, 2024-${new Date().getFullYear()}</span>
            </div>
        `;
    }

    static componentStyles = css`
        #wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--sl-spacing-medium);
            width: 100%;
        }

        #version {
            font-size: 70%;
            font-weight: bold;
        }

        #copyright {
            font-size: 60%;
        }
    `;

    static styles = [resetStyles, UbhAppVersion.componentStyles];

}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-app-version": UbhAppVersion;
    }
}