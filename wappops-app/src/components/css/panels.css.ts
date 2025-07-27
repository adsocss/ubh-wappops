import { css } from "lit";

export const panelsStyles = css`
    sl-split-panel,
    sl-split-panel::part(panel) {
        width: 100%;
        height: 100%;
        background-color: var(--sl-color-neutral-100);
    }

    sl-split-panel::part(panel) {
        display: block;
    }

    sl-tab-group,
    sl-tab-panel,
    sl-tab-group::part(base),
    sl-tab-group::part(body),
    sl-tab-panel::part(base),
    sl-tab-panel::part(body) {
        height: 100%;
        width: 100%;
    }

    .no-selection {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
`;