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

        constructor(file: Files.FileNode) {
                super(file);

                let source = `"Unknown File Contents"`;
                if (this.context instanceof Adapter.SourceFileContext) {
                        source = this.context.getSource();
                }

                this.instance = Monaco.getInstance();
                this.model = window.monaco.editor.createModel(source, "javascript");
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