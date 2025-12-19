import { setupEditorLayout } from "./layout.js";
import { setupEditorFileTree, FileType } from "./files.js";
import { setupEditorTabBar } from "./tabs.js";

export async function createEditor(container) {
        if (document.querySelector("script[src*=\"kit.fontawesome.com\"]") === null) {
                const fontAwesomeScript = document.createElement("script");
                fontAwesomeScript.src = "https://kit.fontawesome.com/03b601dbb5.js";
                fontAwesomeScript.crossOrigin = "anonymous";
                fontAwesomeScript.defer = true;

                document.head.appendChild(fontAwesomeScript);
        }

        const stylesheetUrl = new URL("./editor.css", import.meta.url);
        if (document.querySelector(`link[rel="stylesheet"][href="${stylesheetUrl.href}"]`) === null) {
                const stylesheetLink = document.createElement("link");
                stylesheetLink.rel = "stylesheet";
                stylesheetLink.href = stylesheetUrl.href;

                document.head.appendChild(stylesheetLink);
                await new Promise((resolve, reject) => {
                        stylesheetLink.onload = resolve;
                        stylesheetLink.onerror = reject;
                });
        }

        const htmlUrl = new URL("./editor.html", import.meta.url);
        const htmlResponse = await fetch(htmlUrl);
        container.innerHTML = await htmlResponse.text();

        const editor = container.querySelector("#editor");

        setupEditorLayout(editor);

        const fileTree = setupEditorFileTree(editor);

        fileTree.addFile(null, FileType.SOURCE, "File A");
        fileTree.addFile(null, FileType.SOURCE, "File B");

        const folder1 = fileTree.addFile(null, FileType.FOLDER, "Folder 1");
        fileTree.addFile(folder1, FileType.SOURCE, "File C");

        const folder2 = fileTree.addFile(folder1, FileType.FOLDER, "Folder 2");
        fileTree.addFile(folder2, FileType.SOURCE, "File D");

        fileTree.addFile(folder1, FileType.SOURCE, "File E");
        fileTree.addFile(null, FileType.SOURCE, "File F");

        setupEditorTabBar(editor);
};