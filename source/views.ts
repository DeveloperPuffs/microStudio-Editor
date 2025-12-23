import * as Files from "./files.ts";
import * as Monaco from "./monaco.ts";

abstract class BaseView {
        protected file: Files.FileNode;
        protected wrapper: HTMLDivElement;

        constructor(file: Files.FileNode) {
                this.file = file;

                this.wrapper = document.createElement("div");
                this.wrapper.classList.add("view-wrapper");
        }

        present() {
                const centerContainer = document.querySelector<HTMLDivElement>("#center-container")!;
                centerContainer.appendChild(this.wrapper);
        }

        dismiss() {
                this.wrapper.remove();
        }

        dispose() {
                this.dismiss();
        }
}

export type View = BaseView;

export class CodeView extends BaseView {
        private model: any;
        private instance: any;

        constructor(file: Files.FileNode) {
                super(file);

                this.instance = Monaco.getInstance();
                this.model = window.monaco.editor.createModel(
                        `console.log("Hello, world!")`,
                        "javascript"
                );
        }

        present() {
                super.present();
                this.wrapper.appendChild(Monaco.wrapper);
                this.instance.setModel(this.model);
        }

        dismiss() {
                super.dismiss();
        }

        dispose() {
                super.dispose();
                this.model.dispose();
        }
}