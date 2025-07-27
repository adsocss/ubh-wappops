import { css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { addOutlineIcon, trashOutlineIcon } from "../common/icons";
import { iconStyles } from "../css/icons.css";
import { resetStyles } from "../css/reset.css";
import UbhComponent from "./ubh-component";
import { SlDialog } from "@shoelace-style/shoelace";

export interface ImageListItem {
    filename: string,
    image: File | Blob
    deleted: boolean
    new: boolean
}

@customElement('ubh-image-list')
export abstract class UbhImageList extends UbhComponent {
    @query('#file')
    fileInput?: HTMLInputElement;
    @query('#image-zoom')
    imageZoomDialog?: SlDialog;
    @query('#image-zoom-content')
    imageZoomContent?: HTMLDivElement;

    @property()
    name?: string;
    @property({ type: Number })
    maxItems: number = 3;
    @property({ type: Boolean })
    readonly = false;

    private _imageItems: ImageListItem[] = [];

    /**
     * Devuelve la lista de imágenes de este componente.
     */
    public get images() {
        return this._imageItems;
    }

    /**
     * Devuelve la lista de imágenes que deben cargarse en este componente.
     */
    protected abstract getItems(): Promise<ImageListItem[]>;

    /* Determina si se pueden añadir imágenes */
    protected canAddItem(): boolean {
        return !this.readonly && this._imageItems.length < this.maxItems;
    }

    private handleClickImage(event: MouseEvent) {
        console.log("Image click", event);
        console.log("Image target", event.target);

        const image = (event.target as HTMLImageElement).cloneNode();
        this.imageZoomContent!.innerHTML = ''; // Limpiar contenido previo
        this.imageZoomContent!.append(image);
        this.imageZoomDialog!.show();
    }

    /* Tratar añadir imagen */
    private handleAddItem(_event: Event) {
        if (this.fileInput && this.fileInput.files) {
            Array.from(this.fileInput.files).forEach(file => {
                const item: ImageListItem = {
                    filename: file.name,
                    image: file,
                    deleted: false,
                    new: true
                }

                this._imageItems.push(item);
            });

            this.requestUpdate();
            this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        }
    }

    /* Tratar eliminación de imagen */
    private handleDeleteItem(event: Event) {
        const index = parseInt((event.target as HTMLElement).dataset.fileindex ?? '');
        if (isNaN(index)) return;

        this._imageItems[index].deleted = true;
        this.requestUpdate();
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }

    /* Carga la lista de imágenes a presentar */
    protected load() {
        this._imageItems = [];
        this.getItems()
            .then(i => this._imageItems = i)
            .then(() => this.requestUpdate());
    }

    connectedCallback(): void {
        super.connectedCallback();
        this.load();
    }

    /* Visualizar */
    protected render() {
        return html`
            <header>
                ${this.renderHeader()}
            </header>
            <div id="wrapper">
                <div @click=${this.handleClickImage}>${this.renderImages()}</div>
                ${this.isMobile() ? this.renderAddButton() : nothing}
            </div>
            <sl-dialog id="image-zoom">
                <div id="image-zoom-content"></div>
            </sl-dialog>
        `;
    }

    private renderHeader() {
        if (this.isMobile() || !this.canAddItem()) {
            return nothing;
        }

        return html`
            <div id="header-actions">
               ${this.renderAddButton()} 
            </div>
            <sl-divider></sl-divider>
        `;
    }

    /* Visualizar la lista de imágenes */
    private renderImages() {
        return this._imageItems
            .map((file, index) => {
                return {
                    index: index,
                    file: file
                }
            })
            .filter((item) => !item.file.deleted)
            .map((item) => {
                return html`
                    <div class="image-item">
                        <img src="${window.URL.createObjectURL(item.file.image as Blob)}">
                        <div id="delete-button" @click=${this.handleDeleteItem} data-fileindex=${item.index} class="icon-button">${trashOutlineIcon}</div>
                    </div>
                `;
            });
    }

    /* Visualizar el botón flotante de añadir/crear en modo 'mobile'*/
    private renderAddButton() {
        if (!this.canAddItem()) return nothing;

        if (this.isMobile()) {
            return html`
                <label for="file" id="add-button" class="icon-button mobile">
                    ${addOutlineIcon}
                </label>
                <input @change="${this.handleAddItem}" id="file" type="file" accept="image/*" style="visibility: hidden">
            `;
        }

        return html`
            <label for="file"  class="icon-button mobile">
                <sl-button id="header-add-button" variant="primary" size="small">Añadir</sl-button>
            </label>
            <input @change="${this.handleAddItem}" id="file" type="file" accept="image/*" style="visibility: hidden">
        `;

    }

    // Estilos CSS específicos de este componente.
    static componentStyles = css`
            :host {
                display: grid;
                grid-template-rows: auto 1fr;
                width: 100%;
                height: 100%;
            }

            #wrapper {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                position: relative;
                width: 100%;
                height: 100%;
                padding-left: 1rem;
            }

            header {
                display: flex;
                flex-direction: column;
                width: 100%;
            }

            #header-actions {
                width: 100%;
                padding-bottom: var(--sl-spacing-x-small);
            }

            .image-item {
                width: 80%;
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin-top: var(--sl-spacing-small);
            }

            .image-item img {
                width: 100%;
                max-width: 20rem;
                height: auto;
                padding: var(--sl-spacing-x-small);
                border: 1px solid var(--sl-color-primary-500);
                border-radius: var(--sl-border-radius-medium);
                cursor: pointer;
            }

            #header-add-button {
                pointer-events: none;
            }

            #add-button {
                position: absolute;
                bottom: 0;
                right: 0;
                z-index: 1;
                height: 48px;
                width: 48px;
            }
    
            #add-button svg {
                height: 48px;
                width: 48px;
                border-radius: 50%;
                fill: var(--sl-color-primary-50);
                background-color: var(--sl-color-primary-600);
            }

            #delete-button {
                height: 24px;
                width: 24px;
            }

            #delete-button svg {
                fill: var(--sl-color-danger-400);
            }

            #image-zoom {
                --width: 80rem;
            }

            #image-zoom-content img {
                width: 100%;
                height: auto;
            }

        `;

    static styles = [resetStyles, iconStyles, UbhImageList.componentStyles];
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-image-list': UbhImageList
    }
}