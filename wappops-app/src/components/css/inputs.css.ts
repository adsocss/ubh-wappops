import { css } from "lit";

export const inputsStyles = css`
    sl-option::part(label) {
        font-size: 80%;
        padding: 0.5rem;
    }

    sl-select::part(form-control-label) {
        text-transform: uppercase;
        font-size: 70%;
        font-weight: bold;
    }

    sl-input::part(form-control-label) {
        text-transform: uppercase;
        font-size: 70%;
        font-weight: bold;
    }

    sl-textarea::part(form-control-label) {
        text-transform: uppercase;
        font-size: 70%;
        font-weight: bold;
    }
`;