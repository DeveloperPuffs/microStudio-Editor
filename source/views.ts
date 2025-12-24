import * as Files from "./files.ts";
import * as Adapter from "./adapter.ts";
import * as Monaco from "./monaco.ts";

abstract class BaseView {
        protected file: Files.FileNode;
        protected context: Adapter.FileContext;
        protected wrapper: HTMLDivElement;

        constructor(file: Files.FileNode) {
                this.file = file;
                this.context = file.getContext();

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
        private savedCode: string;
        private saveEventListener: (event: KeyboardEvent) => void;

        constructor(file: Files.FileNode) {
                super(file);
                this.savedCode = "";

                this.instance = Monaco.getInstance();
                this.model = window.monaco.editor.createModel(this.savedCode, "javascript");

                // TODO: The string is compared on every keystroke, maybe use a flag instead for large files
                this.model.onDidChangeContent(() => {
                        const currentCode = this.model.getValue();
                        this.file.setUnsaved(currentCode !== this.savedCode);
                });

                this.saveEventListener = (event: KeyboardEvent) => {
                        const key = event.key ?? String.fromCharCode(event.keyCode);
                        if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === "s") {
                                event.preventDefault();
                                this.writeContent();
                        }
                };

                this.loadContent();
        }

        private async loadContent() {
                const content = await this.context.readContent();
                this.savedCode = content as string;
                this.model.setValue(this.savedCode);
        }

        private async writeContent() {
                const currentCode = this.model.getValue();
                if (currentCode === this.savedCode) {
                        return;
                }

                await this.context.writeContent(currentCode);

                this.savedCode = currentCode;
                this.file.setUnsaved(false);
        }

        present() {
                super.present();
                this.wrapper.appendChild(Monaco.wrapper);
                this.instance.setModel(this.model);

                document.addEventListener("keydown", this.saveEventListener);
        }

        dismiss() {
                super.dismiss();
                document.removeEventListener("keydown", this.saveEventListener);
        }

        dispose() {
                super.dispose();
                this.model.dispose();
        }
}