import { setupEditorLayout } from "./layout.js";
import { setupEditorFileTree } from "./files.js";
import { setupEditorTabBar } from "./tabs.js";
import html from "./editor.html?raw";
import css from "./editor.css?inline";

export const EditorEvent = Object.freeze({
        FILE_ADDED: Symbol("EDITOR_FILE_ADDED"),
        FILE_OPENED: Symbol("EDITOR_FILE_OPENED"),
        FILE_CLOSED: Symbol("EDITOR_FILE_CLOSED"),
        FILE_SELECTED: Symbol("EDITOR_FILE_SELECTED"),
        FILE_DELETED: Symbol("EDITOR_FILE_DELETED")
});

function createEditorState() {
        const eventListeners = new Map();
        function registerEventListener(eventType, listener) {
                const listeners = eventListeners.get(eventType);

                if (listeners === undefined) {
                        eventListeners.set(eventType, [listener]);
                        return;
                }

                listeners.push(listener);
        }

        function notifyEventListeners(eventType, data) {
                const listeners = eventListeners.get(eventType);
                if (listeners === undefined) {
                        return;
                }

                for (const listener of listeners) {
                        listener(data);
                }
        }

        const allFiles = new Set();
        const openFiles = new Set();
        let selectedFile = null;

        function addFile(file) {
                if (!allFiles.has(file)) {
                        allFiles.add(file);
                        notifyEventListeners(EditorEvent.FILE_ADDED, file);
                }
        }

        function selectFile(file) {
                if (!openFiles.has(file)) {
                        openFiles.add(file);
                        notifyEventListeners(EditorEvent.FILE_OPENED, file);
                }

                if (selectedFile !== file) {
                        selectedFile = file;
                        notifyEventListeners(EditorEvent.FILE_SELECTED, file);
                }
        }

        function closeFile(file) {
                if (selectedFile === file) {
                        selectedFile = null;
                        notifyEventListeners(EditorEvent.FILE_SELECTED, null);
                }

                if (openFiles.has(file)) {
                        openFiles.delete(file);
                        notifyEventListeners(EditorEvent.FILE_CLOSED, file);
                }
        }

        function deleteFile(file) {
                closeFile(file);

                if (allFiles.has(file)) {
                        allFiles.delete(file);
                        notifyEventListeners(EditorEvent.FILE_DELETED, file);
                }
        }

        function getSelectedFile() {
                return selectedFile;
        }

        return Object.freeze({
                registerEventListener,
                addFile,
                selectFile,
                closeFile,
                deleteFile,
                getSelectedFile
        });
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

        const editorState = createEditorState();

        const fileTree = setupEditorFileTree(editor, editorState);

        const files = [
                { type: "file", name: "File A.js" },
                { type: "file", name: "File A.js" },
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

        for (const file of files) {
                fileTree.addFile(file);
        }

        const tabBar = setupEditorTabBar(editor, editorState);

        tabBar.openTab("File A.js");
        tabBar.openTab("File B.js");
        tabBar.openTab("File C.js");
};