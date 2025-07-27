import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";

@customElement("ubh-busy")
export default class UbhBusy extends LitElement {
    @query("#wrapper")
    private wrapper!: HTMLDivElement;

    @property({ type: Boolean })
    public hidden: boolean = true;
    @property()
    public message: string = "";
    @property({ type: Boolean, reflect: true })
    public opaque: boolean = false;

    public show() {
        this.wrapper?.classList.remove('hidden');
        this.requestUpdate();
    }

    public hide() {
        this.wrapper?.classList.add('hidden');
        this.requestUpdate();
    }

    /**
     * Renderiza el componente.
     */
    protected render() {
        return html`
            <div id="wrapper" class="${this.hidden ? 'hidden' : ''} ${this.opaque ? 'opaque' : ''}">
                <div id="content">
                    <sl-spinner style="font-size: 4rem; --track-width: 5px;"></sl-spinner>
                    <span>${this.message}</span>
                </div>
            </div>
        `;
    }

    static styles = css`
        #wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: var(--sl-z-index-dialog, 800); 
            background-color: var(--sl-overlay-background-color);
        }

        #wrapper.opaque {
            background-color: var(--sl-color-neutral-0);
            z-index: 10000; /* Asegura que el overlay sea más alto que otros elementos */
        }

        #wrapper.hidden {
            display: none;
        }

        #content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--sl-spacing-medium);
        }

        #content span {
            font-size: var(--sl-font-size-x-small);
            text-transform: uppercase;
            color: var(--sl-color-neutral-1000);
        }
    `;

}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-busy": UbhBusy;
    }
}