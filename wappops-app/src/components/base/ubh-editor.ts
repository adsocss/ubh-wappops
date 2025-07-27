import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { inputsStyles } from '../css/inputs.css';
import { resetStyles } from '../css/reset.css';

@customElement('ubh-editor')
export class UbhEditor extends LitElement {
  @property()
  name: string = '';
  @property()
  label?: string;
  @property()
  value: string = '';
  @property({ type: Boolean })
  readonly: boolean = false;

  private dirty: boolean = false;

  render() {
    return html`
      <label>${this.label}</label>
      <article @focusout=${this.handleFocusOut} @input=${this.handleInput}
        contenteditable=${!this.readonly}>
        ${this.formatValue()}
      </article>
    `;
  }



  private formatValue() {
    try {
      return unsafeHTML(this.value ?? '');
    } catch (error) {
      return this.value ?? '';
    }
  }

  private handleInput() {
    this.dirty = true;
  }

  private handleFocusOut(event: Event) {
    try {
      if (this.dirty) {
        const element = (event.target as HTMLElement);
        const content = ((element.textContent) ?? '').trim();
        this.value = content;
        this.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: this.value } }));
      }
    } catch (_error) {
      console.log('editor error ', _error)
      // Ignorar error
    }
  }

  // Estilos css específicos de este componente.
  static componentStyles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      padding: 0.5rem;
    }

    label {
      font-size: 70%;
      font-weight: bold;
      text-transform: uppercase;
    }

    article {
      height: 100%;
      overflow-y: auto;
      width: 100%;
      outline: none;
      border: 0.5px solid var(--sl-input-border-color);
      border-radius: 5px;
      padding: 1rem;
      color: var(--sl-input-color);
      background-color: var(--sl-input-background-color);
    }

  article:focus {
        border: 2px solid var(--sl-input-border-color-focus);
        color: var(--sl-input-color-hover);
  }
  `;

  static styles = [resetStyles, inputsStyles, UbhEditor.componentStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    'ubh-editor': UbhEditor
  }
}
