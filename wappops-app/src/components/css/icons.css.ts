import { css } from "lit";

export const iconStyles = css`
    .icon-button {
        cursor: pointer;
    }

    .icon-button.toolbar svg {
        fill: var(--sl-color-primary-600);
    }
    
    .icon-button.toolbar.mobile svg {
        height: 36px;
        width: 36px;
    }
`;