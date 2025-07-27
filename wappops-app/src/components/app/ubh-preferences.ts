import { SlInput, SlSwitch } from "@shoelace-style/shoelace";
import { css, html } from "lit";
import { customElement } from "lit/decorators.js";
import UbhComponent from "../base/ubh-component";
import "../common/ubh-theme-toggle";
import { inputsStyles } from "../css/inputs.css";
import { resetStyles } from "../css/reset.css";
import "../hhrr/ubh-department-select";
import { UbhDepartmentSelect } from "../hhrr/ubh-department-select";

@customElement("ubh-preferences")
export class UbhPreferences extends UbhComponent {

    /* Tratamiento general de los eventos de cambios */
    private handleChange(event: Event) {
        const target = event.target as HTMLElement;
        const prefs = this.ctx.configuration.preferences;

        switch (target.id) {
            case 'theme':
                const html = document.querySelector('html');
                if (html) {
                    prefs.theme = html.classList.contains('sl-theme-dark') ? 'dark' : 'light';
                }
                break;
            case 'enabled':
                prefs.notifications.sound.enabled = (target as SlSwitch).checked;
                break;
            case 'vibration':
                prefs.notifications.vibration = (target as SlSwitch).checked ? 'enabled' : 'disabled';
                break;
            case 'repeat':
                const repeat = parseInt((target as SlInput).value);
                prefs.notifications.sound.repeat = isNaN(repeat) ? 1 : Math.max(1, Math.min(5, repeat));
                break;
            case 'departments':
                const value = (target as UbhDepartmentSelect).value;
                if (!value) {
                    prefs.notifications.departments = [];
                    break;
                }

                if (Array.isArray(value)) {
                    prefs.notifications.departments = value;
                } else {
                    prefs.notifications.departments = [value];
                }

                break;

            default: return
        }

        this.ctx.configuration = { ...this.ctx.configuration, preferences: prefs };
        this.requestUpdate();

    }

    protected render() {
        const prefs = this.ctx.configuration.preferences;

        return html`
        <div id="wrapper">
            <header>
                <h3>Preferencias</h3>
                <sl-divider></sl-divider>
            </header>
            <main @sl-change=${this.handleChange}
                  @change=${this.handleChange}
                >
                <section>
                    <span class="title">Apariencia</span>
                    <sl-divider></sl-divider>
                    <label>
                        Tema visual
                        <ubh-theme-toggle id="theme" .value=${prefs.theme}></ubh-theme-toggle>
                    </label>
                </section>
                <section>
                    <span class="title">Alertas de tareas</span>
                    <sl-divider></sl-divider>
                    <label>
                        Habilitar sonido
                        <sl-switch id="enabled" ?checked=${prefs.notifications.sound.enabled}></sl-switch>
                    </label>
                    <label>
                        Habilitar vibración
                        <sl-switch id="vibration" ?checked=${prefs.notifications.vibration === 'enabled'}></sl-switch>
                    </label>
                    <sl-input label="Repeticiones del tono" id="repeat" type="number" min="1" max="5" size="small"
                        ?disabled=${!prefs.notifications.sound.enabled}
                        value=${prefs.notifications.sound.repeat}
                    ></sl-input>
                    <ubh-department-select label="Limitar a departamentos" id="departments"
                        .value=${prefs.notifications.departments}
                        multiple clearable
                    ></ubh-department-select>
                </section>
            </main>
        </div>
        `;
    }

    static componentStyles = css`
        :host {
            display: flex;
            justify-content: center;
            width: 100%;
        }

        #wrapper {
            display: grid;
            grid-template-rows: auto 1fr auto;
            width: 100%;
            max-width: 40rem;
            padding: var(--sl-spacing-medium);
        }

        main, section {
            display: flex;
            flex-direction: column;
            gap: var(--sl-spacing-small);
            width: 100%;
        }

        section {
            margin-top: var(--sl-spacing-medium);
        }

        h3, .title {
            font-weight: bold;
            margin-top: var(--sl-spacing-medium);
        }

        label {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
    `;

    static styles = [resetStyles, inputsStyles, UbhPreferences.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        "ubh-preferences": UbhPreferences;
    }
}