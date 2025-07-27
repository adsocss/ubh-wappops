import { SlDialog } from "@shoelace-style/shoelace";
import { css, html, nothing } from "lit";
import { customElement, query } from "lit/decorators.js";
import { canReadCounters, canReadRooms, canReadTasks, canWriteCounters, canWriteRooms, canWriteTasks } from "../../application/utils/permissions-fns";
import logo from "../../assets/logo.svg";
import UbhComponent from "../base/ubh-component";
import { countersIcon, qrIcon, roomsIcon, settingsOutlineIcon, syncIcon, tasksIcon } from "../common/icons";
import "../common/ubh-app-version";
import "../common/ubh-theme-toggle";
import "../common/ubh-user";
import { resetStyles } from "../css/reset.css";

@customElement("ubh-menu")
export default class UbhMenu extends UbhComponent {
  @query("#qr-dialog")
  private qrDialog!: SlDialog;
  
  /* Abrir diálogo con el QR de la aplicación */
  private handleQRClick() {
    this.qrDialog.show();
  }

  protected render() {
    if(this.isMobile()) {
      return this.renderMobile();
    }

    return html`
            <div id="wrapper">
                <header>
                </header>
                <nav>
                  ${this.renderMenuItems()}
                </nav>
                <footer>
                    <div id="qr-icon" @click=${this.handleQRClick}>${qrIcon}</div>
                    <ubh-app-version></ubh-app-version>
                </footer>
            </div>
            <sl-dialog id="qr-dialog" label=${window.location.origin}>  
                <sl-qr-code value=${window.location.origin} size="300" errorCorrection="M"
                ></sl-qr-code>
            </sl-dialog>        
        `;
  }

  protected renderMobile() {
    return html`
            <div id="wrapper">
                <header>
                    <img id="logo" src=${logo} alt="Universal Beach Hotels" />
                    <span id="title">UBH Operaciones</span>
                    <ubh-theme-toggle></ubh-theme-toggle>
                </header>
                <nav>
                  ${this.renderMenuItems()}
                </nav>
                <footer>
                    <div id="qr-icon" @click=${this.handleQRClick}>${qrIcon}</div>
                    <ubh-user></ubh-user>
                    <ubh-app-version></ubh-app-version>
                </footer>
            </div>
            <sl-dialog id="qr-dialog" label=${window.location.origin}>  
                <sl-qr-code value=${window.location.origin} size="150" xerrorCorrection="M"
                ></sl-qr-code>
            </sl-dialog>        
        `;
  }

  protected renderMenuItems() {
    if (!this.ctx.currentUser) {
      return nothing;
    }

    const tasksAllowed = canReadTasks(this.ctx.currentUser) || canWriteTasks(this.ctx.currentUser);
    const roomsAllowed = canReadRooms(this.ctx.currentUser) || canWriteRooms(this.ctx.currentUser);
    const countersAllowed = canReadCounters(this.ctx.currentUser) || canWriteCounters(this.ctx.currentUser);


    // Visualizar opciones de menú según los permisos del usuario.
    return html`
        ${tasksAllowed ? html`<a href="#/tasks">${tasksIcon}Tareas</a>` : nothing}
        ${roomsAllowed ? html`<a href="#/rooms-status">${roomsIcon}Estados de habitaciones</a>` : nothing}
        ${countersAllowed ? html`<a href="#/resource-counters">${countersIcon}Lecturas de contadores</a>` : nothing}
        <a href="#/synchronization">${syncIcon}Sincronización de datos</a>
        <a href="#/preferences">${settingsOutlineIcon}Preferencias</a>
    `;    
  }


  // Estilos CSS específicos de este componente.
  static componentStyles = css`

    a {
        display: flex;
        align-items: center;
        gap: var(--sl-spacing-x-small);
        text-decoration: none;
        color: var(--sl-color-primary-800);
        font-size: var(--sl-font-size-small);
        font-weight: var(--sl-font-weight-semibold);
        text-transform: uppercase;
    }

    a svg {
        fill: var(--sl-color-primary-800);
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
    }

    nav {
      display: flex;
      flex-direction: column;
      gap: var(--sl-spacing-x-small);
      padding: var(--sl-spacing-medium);
      width: 100%;
      max-width: 250rem;
      height: 100%;
    }
    
    #logo {
      height: 36px;
      width: auto;
    }

    #title {
      font-size: var(--sl-font-size-medium);
      font-weight: var(--sl-font-weight-semibold);
      color: var(--sl-color-primary-800);
      text-transform: uppercase;
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

  static styles = [resetStyles, UbhMenu.componentStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    "ubh-menu": UbhMenu;
  }
}