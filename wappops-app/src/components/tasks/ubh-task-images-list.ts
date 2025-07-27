import { ITaskDocument } from "@model/data-model";
import { customElement, property } from "lit/decorators.js";
import { ImageListItem, UbhImageList } from "../base/ubh-image-list";

/**
 * Adaptador para UbhImageList.
 */ 
export interface TaskDocumentItem extends ITaskDocument, ImageListItem {
}

@customElement('ubh-task-images-list')
export class UbhTaskImageList extends UbhImageList {

    private _value: ITaskDocument[] | undefined;

    @property({ type: Array })
    public set value(val: ITaskDocument[] | undefined) {
        this._value = val;
        this.load();
    }

    public get value(): ITaskDocument[] {
        return (super.images as TaskDocumentItem[])
        .map(i => {
            return {
                ...i,
                date: new Date(),
                status: i.deleted ? 'deleted' : (i.new ? 'new' : i.status),
                contents: i.image
            };
        });
    }

    protected getItems(): Promise<TaskDocumentItem[]> {
        const images: TaskDocumentItem[] = (this._value ?? [])
            .filter(d => (d.contents ?? undefined) !== undefined)
            .map(d => {
                return {
                    ...d,
                    filename: d.filename,
                    image: d.contents as Blob,
                    deleted: d.status === "deleted",
                    new: d.status === "new"
                }
            });

        return new Promise((resolve, _reject) => {
            resolve(images)
        });
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ubh-task-images-list': UbhTaskImageList
    }
}