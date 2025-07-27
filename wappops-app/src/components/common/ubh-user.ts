import { css, html } from "lit";
import { customElement } from "lit/decorators.js";
import { iconStyles } from "../css/icons.css";
import { resetStyles } from "../css/reset.css";
import { logoutIcon } from "../common/icons";
import { EVT_LOGOUT } from "../../application/events";
import UbhComponent from "../base/ubh-component";

@customElement('ubh-user')
export class UbhUser extends UbhComponent {

    private logout() {
        document.dispatchEvent(new Event(EVT_LOGOUT, {bubbles: true, composed: true}));
    }

    protected render() {
        let displayName = this.ctx.currentUser?.employee?.fullName ?? '';
        if (displayName.length === 0) {
            displayName = this.ctx.currentUser?.username ?? '';
        }

        return html`
            <div id="wrapper">
                <div>
                    <sl-avatar label="Usuario"></sl-avatar>
                    <span class="name">${displayName}</span>
                </div>
                <div class="icon-button" @click=${this.logout}>${logoutIcon}</div>
            </div>
        `;
    }

    static componentStyles = css`
        #wrapper {
            display: flex;
            align-items: center;
            gap: var(--sl-spacing-medium);
            font-size: 90%;
            padding-left: var(--sl-spacing-medium);
            padding-right: var(--sl-spacing-medium);
        }

        sl-avatar {
            --size: 1.4rem;
        }

        .name {
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
    `;

    static styles = [resetStyles, iconStyles, UbhUser.componentStyles];

}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-user': UbhUser;
    }
}