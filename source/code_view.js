import { BaseView, getMonacoInstance } from "./editor.js";

export class CodeView extends BaseView {
        constructor(editor, file) {
                super(editor, file);

                const monacoInstance = getMonacoInstance();
                // Use it to create a monaco instance
        }

        present() {
        }

        dismiss() {
        }

        dispose() {
        }
}