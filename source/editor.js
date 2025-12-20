import { setupEditorLayout } from "./layout.js";
import { setupEditorFileTree, FileType } from "./files.js";
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

        fileTree.addFile(null, FileType.SOURCE, "File A.js");
        fileTree.addFile(null, FileType.SOURCE, "File B.js");

        const folder1 = fileTree.addFile(null, FileType.FOLDER, "Folder 1");
        fileTree.addFile(folder1, FileType.SOURCE, "File C.js");

        const folder2 = fileTree.addFile(folder1, FileType.FOLDER, "Folder 2");
        fileTree.addFile(folder2, FileType.SOURCE, "File D.js");

        fileTree.addFile(folder1, FileType.SOURCE, "File E.js");
        fileTree.addFile(null, FileType.SOURCE, "File F.js");

        setupEditorTabBar(editor);
};