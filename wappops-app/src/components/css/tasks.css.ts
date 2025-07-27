import { css } from "lit";

/**
 * Estilos específicos para los componentes vinculados a tareas.
 * NOTA: candidatos a personalizaciones de usuario. 
 */

export const tasksStyles = css`
    .priority.low {
        color: var(--sl-color-neutral-600);
        background-color: var(--sl-color-neutral-200);
    }    
    .priority.medium {
        color: var(--sl-color-neutral-50);
        background-color: var(--sl-color-warning-500);
    }
    .priority.high {
        color: var(--sl-color-neutral-50);
        background-color: var(--sl-color-danger-400);
    }
    .priority.urgent {
        color: var(--sl-color-neutral-50);
        background-color: var(--sl-color-danger-500);
    }

    .status.active {
        color: var(--sl-color-danger-500);
        background-color: inherit;
    }
    .status.pending {
        color: var(--sl-color-danger-500);
        background-color: inherit;
    }
    .status.closed {
        color: var(--sl-color-success-600);
        background-color: inherit;
    }
`;