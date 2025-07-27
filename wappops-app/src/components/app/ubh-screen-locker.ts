import { SlAlert } from "@shoelace-style/shoelace";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";

@customElement("ubh-screen-locker")
export default class UbhScreenLocker extends LitElement {
    @query("#wrapper")
    private wrapper!: HTMLDivElement;
    @query("sl-alert")
    private alert!: SlAlert;

    @property()
    variant: 'primary' | 'success' | 'neutral' | 'warning' | 'danger' = 'primary';

    public show() {
        this.wrapper?.classList.remove('hidden');
        this.alert?.show()
    }

    public hide() {
        this.wrapper?.classList.add('hidden');
        this.alert?.hide
    }

    /**
     * Renderiza el componente.
     */
    protected render() {
        return html`
            <div id="wrapper" class="${navigator.onLine ? 'hidden' : ''}">
                <sl-alert variant="${this.variant}" .open=${!navigator.onLine}>
                    <slot></slot>
                </sl-alert>
            </div>
        `;
    }

    static styles = css`
        #wrapper {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: center;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: var(--sl-z-index-dialog, 800); 
            background-color: var(--sl-overlay-background-color);
        }

        #wrapper.hidden {
            display: none;
        }
    `;

}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-screen-locker": UbhScreenLocker;
    }
}