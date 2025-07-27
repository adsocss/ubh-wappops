import { resetStyles } from "../css/reset.css";
import { SlButton } from "@shoelace-style/shoelace";
import { css, html, LitElement } from "lit";
import { customElement, property, query, queryAssignedElements, state } from "lit/decorators.js";

/**
 * Evento de formulario guardado.
 */
export const EVT_FORM_SAVED = 'ubh-form-saved';


@customElement('ubh-form')
export class UBHForm extends LitElement {
    @query('form')
    form?: HTMLFormElement;
    @queryAssignedElements()
    assignedElements?: HTMLElement[];

    @property({ type: Boolean, reflect: true })
    disabled = false;

    @state()
    changed = false;

    /* Visualizar */
    protected render() {
        return html`
            <form @change="${this.handleChange}"
                  @sl-change="${this.handleChange}"
                  @keyup="${this.handleKeyEvent}"
                  @click="${this.handleSubmitButtonClick}"
            >
                <div><slot name="header" slot="header"></slot></div>
                <div><slot name="body" slot="body" part="body"></slot></div>
                <div><slot name="footer" slot="footer"></slot></div>
            </form>
        `;
    }

    /**
     * Enviar formulario.
     */
    public submit() {
        this.dispatchEvent(new SubmitEvent('submit', {bubbles: true, composed: true}));
    }

    /*
     * Emula el comportamiento de los formularios nativos
     * al pulsar la tecla 'Enter'.
     */
    private handleKeyEvent(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            this.submit();
        }
    }

    /*
     * Emula el comportamiento de los formularios nativos
     * al pulsar sobre un botón o control de entrada de tipo "submit".
     */
    private handleSubmitButtonClick(event: Event)  {
        if (event.target instanceof SlButton && event.target.type === "submit") {
            this.submit();
        }

        if (event.target instanceof HTMLInputElement && event.target.type === "submit") {
            this.submit();
        }

        if (event.target instanceof HTMLButtonElement && event.target.type === "submit") {
            this.submit();
        }
    }

    /**
     * Tratar cambios en el formulario.
     * @param event - Event
     */
    protected handleChange(_event: Event) {
        this.changed = true;
    }

    // Estilos CSS específicos de este componente.
    private static componentStyles = css`
        form {
            display: grid;
            grid-template-rows: auto 1fr auto;
            width: 100%;
            height: 100%;
            padding: var(--sl-spacing-medium);
            background-color: var(--sl-color-neutral-0);
        }
    `;

    static styles = [resetStyles, UBHForm.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-form': UBHForm
    }
}