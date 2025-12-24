import * as Files from "./files.ts";
import * as Adapter from "./adapter.ts";
import * as Monaco from "./monaco.ts";
import * as Modal from "./modal.ts";
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
        private static saveWarned: boolean = false;

        private model: any;
        private instance: any;
        private savedCode: string;
        private saveEventListener: (event: KeyboardEvent) => void;

        constructor(file: Files.FileNode) {
                super(file);
                this.savedCode = "";

                let language;
                switch (this.context.extension) {
                        case "js": {
                                language = "javascript";
                                break;
                        }

                        case "ms": {
                                language = "microscript";
                                break;
                        }

                        case "json": {
                                language = "json";
                                break;
                        }

                        case "md": {
                                language = "markdown";
                                break;
                        }

                        default: {
                                language = "plaintext";
                                break;
                        }
                }

                this.instance = Monaco.getInstance();
                this.model = window.monaco.editor.createModel(this.savedCode, language);

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

                this.file.saveCallback = async () => {
                        await this.writeContent();
                };

                this.readContent();
        }

        private async readContent() {
                try {
                        const content = await this.context.readContent();
                        this.savedCode = content as string;
                        this.model.setValue(this.savedCode);
                } catch (error) {
                        const message = `Failed to read source file content: ${error}`; 
                        this.model.setValue(message);
                        console.log(message);
                }
        }

        private async writeContent() {
                const currentCode = this.model.getValue();
                if (currentCode === this.savedCode) {
                        return;
                }

                if (!CodeView.saveWarned) {
                        CodeView.saveWarned = true;
                        const saveWarningModal = new Modal.Modal({
                                title: "Editor Out of Sync",
                                body: `
                                        This project's source code was modified using the editor plugin.
                                        Your project/game will still run using the latest saved code, but
                                        the microStudio code editor might not reflect these changes yet.
                                        <br><br>
                                        If you want to edit or view the updated code in the microStudio
                                        editor, please save all files and refresh the page.
                                `,
                                buttonOptions: [
                                        { label: "Ok" }
                                ]
                        });

                        await saveWarningModal.prompt();
                }

                try {
                        await this.context.writeContent(currentCode);
                        this.savedCode = currentCode;
                        this.file.setUnsaved(false);
                } catch (error) {
                        console.log(`Failed to write source file content: ${error}`);
                }
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
                this.file.saveCallback = undefined;
        }
}