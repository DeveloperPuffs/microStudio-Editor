import { setupEditorLayout } from "./layout.js";
import { setupEditorFiles } from "./files.js";
import html from "./editor.html?raw";
import css from "./editor.css?inline";

export class BaseView {
        constructor(editor) {
                this.editor = editor;
                this.container = editor.querySelector("#center-container");
                this.wrapper = document.createElement("div");
                this.wrapper.classList.add("view-wrapper");
        }

        present() {
                this.container.appendChild(this.wrapper);
        }

        dismiss() {
                this.wrapper.remove();
        }
}

export function createEditor(container) {
        if (document.querySelector("script[src*=\"kit.fontawesome.com\"]") === null) {
                const fontAwesomeScript = document.createElement("script");
                fontAwesomeScript.src = "https://kit.fontawesome.com/03b601dbb5.js";
                fontAwesomeScript.crossOrigin = "anonymous";
                fontAwesomeScript.defer = true;

                document.head.appendChild(fontAwesomeScript);
        }

        if (document.querySelector("#editor-stylesheet") === null) {
                const stylesheet = document.createElement("style");
                stylesheet.id = "editor-stylesheet";
                stylesheet.textContent = css;

                document.head.appendChild(stylesheet);
        }

        container.innerHTML = html;
        const editor = container.querySelector("#editor");

        setupEditorLayout(editor);

        const fileViews = new Map();
        let currentView = null;

        function onFileOpen(file) {
                if (currentView !== null) {
                        currentView.dismiss();
                }

                if (!fileViews.has(file)) {
                        const view = new BaseView(editor);
                        view.wrapper.textContent = file.name;
                        fileViews.set(file, view);
                }

                currentView = fileViews.get(file);
                currentView.present();
        }

        function onFileClose(file) {
                if (!fileViews.has(file)) {
                        return; 
                }

                const view = fileViews.get(file);
                if (view === currentView) {
                        currentView = null;
                        view.dismiss();
                }

                fileViews.delete(file);
        }

        const files = setupEditorFiles(editor, onFileOpen, onFileClose);

        const filesData = [
                { type: "file", name: "File A.js" },
                { type: "file", name: "File B.js" },
                {
                        type: "folder", name: "Folder 1",
                        children: [
                                { type: "file", name: "File C.js" },
                                {
                                        type: "folder", name: "Folder 2",
                                        children: [
                                                { type: "file", name: "File D.js" },
                                        ]
                                },
                        ]
                },
                { type: "file", name: "File E.js" },
                { type: "file", name: "File F.js" },
        ];

        for (const fileData of filesData) {
                files.addFile(fileData);
        }
};