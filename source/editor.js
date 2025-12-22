import { setupEditorLayout } from "./layout.js";
import { setupEditorFiles } from "./files.js";
import { CodeView } from "./code_view.js";
import html from "./editor.html?raw";
import css from "./editor.css?inline";

// Some variables are shared because Monaco is loaded and managed globally
let monacoPromise = null;
let monacoInstance = null;

export function getMonacoInstance() {
        return monacoInstance;
}

async function loadMonaco() {
        if (monacoInstance !== null) {
                return;
        }

        if (monacoPromise !== null) {
                await monacoPromise;
                return;
        }

        monacoPromise = new Promise((resolve, reject) => {  
                const requireMonaco = () => {
                        window.require.config({
                                paths: {
                                        vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs"
                                }
                        });

                        window.require(
                                ["vs/editor/editor.main"],
                                () => {
                                        const monacoWrapper = document.createElement("div");
                                        monacoInstance = monaco.editor.create(monacoWrapper, {
                                                automaticLayout: true,
                                                theme: "vs-dark"
                                        });

                                        resolve();
                                },
                                reject
                        );
                };
                if (window.require !== undefined) {
                        requireMonaco(resolve, reject);
                        return;
                }

                const script = document.createElement("script");
                script.src = "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js";
                script.onload = requireMonaco;
                script.onerror = reject;
                document.head.appendChild(script);
        });
}

export class BaseView {
        constructor(editor, file) {
                this.file = file;
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

        dispose() {
                // Usually not neccessary, but some views might require some cleanup when closing
        }
}

export async function createEditor(container) {
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

        await loadMonaco();

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
                        const view = new CodeView(editor, file);
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
                view.dispose();
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