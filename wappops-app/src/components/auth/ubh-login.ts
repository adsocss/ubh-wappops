import { consume } from "@lit/context";
import { Task } from "@lit/task";
import { ICredentials, IUser } from "@model/data-model";
import "@shoelace-style/shoelace";
import { SlAlert, SlDialog } from "@shoelace-style/shoelace";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, query } from "lit/decorators.js";
import { APIException } from "../../application/services/api-service";
import { wappops, Wappops } from "../../application/wappops";
import logo from "../../assets/logo.svg";
import { resetStyles } from "../../components/css/reset.css";
import { qrIcon } from "../common/icons";
import "../common/ubh-app-version";
import "../common/ubh-busy";
import UbhBusy from "../common/ubh-busy";
import "../common/ubh-theme-toggle";
import { EVT_LOGIN } from "../../application/events";
import UbhScreenLocker from "@components/app/ubh-screen-locker";
import "../app/ubh-screen-locker"; 
import { USER_NAME_KEY } from "../../application/local-storage-keys";

/**
 * Vista de inicio de sesión.
 */
@customElement("ubh-login")
export default class UbhLogin extends LitElement {
  @query('#username')
  private usernameInput!: HTMLInputElement;
  @query('#password')
  private passwordInput!: HTMLInputElement;
  @query('#busy-indicator')
  private busyIndicator!: UbhBusy;
  @query('#qr-dialog')
  private qrDialog!: SlDialog;
  @query('#error-alert')
  private errorAlert!: SlAlert;
  @query('ubh-screen-locker')
  private screenLocker!: UbhScreenLocker;

  @consume({ context: wappops })
  private ctx!: Wappops;
  private _credentials: ICredentials | undefined = undefined;
  private error: APIException | undefined = undefined;
  private loginTask = this.createLoginTask;

  /* Obtener las credenciales del formulario */
  private handleSubmit(event: Event) {
    event.preventDefault();

    const username = this.usernameInput.value ?? '';
    const password = this.passwordInput.value ?? '';
    if (username === '' || password === '') {
      return;
    }

    this._credentials = { username, password };
    this.busyIndicator.show();

    // Inicio diferido para 'feedback' visual
    setTimeout(() => {
      this.loginTask().run();
    }, 500);
  }

  /* Abrir diálogo con el QR de la aplicación */
  private handleQRClick() {
    this.qrDialog.show();
  }

  /* Crear tarea de login */
  private createLoginTask() {
    return new Task(
      this,
      {
        task: ([credentials]) => {
          return this.ctx.api?.login(credentials as ICredentials);
        },
        args: () => [this._credentials]
        , onComplete: (response) => {
          this.ctx.currentUser = response as IUser;
          this.dispatchEvent(new CustomEvent(EVT_LOGIN, { detail: response, bubbles: true, composed: true }));
          this.busyIndicator.hide();
        }
        , onError: (error) => {
          this.error = error as APIException;
          this.busyIndicator.hide();
          this.errorAlert.show();
        }
      }
    );
  }

  private disableActions() {
    this.screenLocker.show();
  }

  private enableActions() {
    this.screenLocker.hide();
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Eventos de conectividad de red
    window.addEventListener('offline', this.disableActions.bind(this));
    window.addEventListener('online', this.enableActions.bind(this));
  }

  disconnectedCallback(): void {
    // Desactiva monitores de eventos
    window.removeEventListener('offline', this.disableActions);
    window.removeEventListener('online', this.enableActions);
  }

  protected willUpdate(_changedProperties: PropertyValues): void {
    // Obtener el nombre del último usuario autenticado en el dispositivo.
    let username = this.ctx.currentUser?.username;
    if (!username) {
      // Si no hay usuario autenticado, se obtiene del valor específico en localstorage
      username = localStorage.getItem(USER_NAME_KEY) ?? '';
    }

    if (!this._credentials) {
      this._credentials = {
        username: username,
        password: ''
      };
    }
  }

  /* Visualización del componente */
  protected render() {
    return html`
      <div id="wrapper">
        <header>
          <img id="logo" src=${logo} alt="Universal Beach Hotels" />
          <span id="title">UBH Operaciones</span>
          <ubh-theme-toggle></ubh-theme-toggle>
        </header>
        <form @submit=${this.handleSubmit}>
          <sl-input id="username" name="username" placeholder="Usuario" size='small'
            required
            value=${this._credentials?.username ?? ''}
          ></sl-input>
          <sl-input id="password" name="password" type="password" placeholder="Contraseña" size='small'
            password-toggle
            required></sl-input>
          <sl-button type="submit" variant="primary" size="small">Entrar</sl-button>
        </form>
        <footer>
          <div id="qr-icon" @click=${this.handleQRClick}>${qrIcon}</div>
          <ubh-app-version></ubh-app-version>
        </footer>

        <sl-alert id="error-alert" variant="danger" closable>
          ${this.error?.message}
        </sl-alert>
      </div>
      <sl-dialog id="qr-dialog" label=${window.location.origin}>  
        <sl-qr-code value=${window.location.origin} size="300" errorCorrection="M"
        ></sl-qr-code>
      </sl-dialog>
      <ubh-busy id="busy-indicator" message='Iniciando sesión ...'></ubh-busy>
      <ubh-screen-locker variant="danger">
        Dispositivo sin conexión. Revise su conexión o busque un área con cobertura.
      </ubh-screen-locker>
    `;
  }

  //* Estilos del componente */
  static componentStyles = css`
    :host {
      display: flex;
      justify-content: center;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    #wrapper {
      display: grid;
      grid-template-rows: auto 1fr auto;
      align-content: center;
      width: 100%;
      max-width: 25rem;
      height: 100%;
    }
  
    header {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 1rem;
      margin-top: 5rem;
    }
    
    #logo {
      width: 250px;
      height: auto;
    }

    #title {
      font-size: var(--sl-font-size-large);
      font-weight: var(--sl-font-weight-semibold);
      color: var(--sl-color-primary-800);
      text-transform: uppercase;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: var(--sl-spacing-medium);
      padding: 2rem;
      width: 100%;
      max-width: 250rem;
      height: 100%;
    }

    #qr-icon {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--sl-spacing-medium);
    }

    #qr-icon svg {
      cursor: pointer;
      width: 48px;
      height: 48px;
      fill: var(--sl-color-neutral-1000);
    }

    #qr-dialog::part(body) {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  `;

  static styles = [resetStyles, UbhLogin.componentStyles]

}

declare global {
  interface HTMLElementTagNameMap {
    "ubh-login": UbhLogin;
  }
}