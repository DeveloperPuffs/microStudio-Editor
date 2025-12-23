import * as Files from "./files.ts";

abstract class BaseView {
        protected file: Files.FileNode;
        private wrapper: HTMLDivElement;

        constructor(file: Files.FileNode) {
                this.file = file;

                this.wrapper = document.createElement("div");
                this.wrapper.classList.add("view-wrapper");
        }

        present() {
                const centerPanel = document.querySelector<HTMLDivElement>("#center-panel")!;
                centerPanel.appendChild(this.wrapper);
        }

        dismiss() {
                this.wrapper.remove();
        }

        dispose() {
                // Usually not neccessary, but some views might require some cleanup when closing
        }
}

export type View = BaseView;

export class CodeView extends BaseView {
        constructor(file: Files.FileNode) {
                super(file);
        }

        present() {
        }

        dismiss() {
        }

        dispose() {
        }
}