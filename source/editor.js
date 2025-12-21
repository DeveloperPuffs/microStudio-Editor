import { setupEditorLayout } from "./layout.js";
import { setupEditorFileTree } from "./files.js";
import { setupEditorTabBar } from "./tabs.js";
import html from "./editor.html?raw";
import css from "./editor.css?inline";

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

        const fileTree = setupEditorFileTree(editor);

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

        setupEditorTabBar(editor);
};