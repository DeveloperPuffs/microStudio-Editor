import * as Layout from "./layout.ts";
import * as Files from "./files.js";
import * as Views from "./views.ts";

import html from "./editor.html?raw";
import css from "./editor.css?inline";

let editorSetup = false;

export function setupEditor(container: HTMLElement) {
        if (editorSetup) {
                return;
        }

        editorSetup = true;

        const fontAwesomeScript = document.createElement("script");
        fontAwesomeScript.src = "https://kit.fontawesome.com/03b601dbb5.js";
        fontAwesomeScript.crossOrigin = "anonymous";
        fontAwesomeScript.defer = true;

        document.head.appendChild(fontAwesomeScript);

        const stylesheet = document.createElement("style");
        stylesheet.textContent = css;
        document.head.appendChild(stylesheet);

        container.innerHTML = html;

        Layout.setupEditorLayout();

        const fileViews = new Map<Files.FileNode, Views.View>();
        let currentView: Views.View | undefined;

        Files.registerEventListener(Files.FileEvent.FILE_OPENED, (file: unknown) => {
                if (!(file instanceof Files.FileNode)) {
                        return;
                }

                currentView?.dismiss();

                if (!fileViews.has(file)) {
                        const view = new Views.CodeView(file);
                        fileViews.set(file, view);
                }

                currentView = fileViews.get(file);
                currentView?.present();
        })

        Files.registerEventListener(Files.FileEvent.FILE_CLOSED, (file: unknown) => {
                if (!(file instanceof Files.FileNode)) {
                        return;
                }

                const view = fileViews.get(file);
                if (view === undefined) {
                        return;
                }

                if (view === currentView) {
                        currentView = undefined;
                        view.dismiss();
                }

                fileViews.delete(file);
                view.dispose();
        });

        const rootNode = new Files.RootNode();

        const fileA = new Files.FileNode("File A.js");
        const fileB = new Files.FileNode("File B.js");
        const fileC = new Files.FileNode("File C.js");
        const fileD = new Files.FileNode("File D.js");
        const fileE = new Files.FileNode("File E.js");
        const fileF = new Files.FileNode("File F.js");

        const folder1 = new Files.FolderNode("Folder 1");
        const folder2 = new Files.FolderNode("Folder 1");

        rootNode.addChild(fileA);
        rootNode.addChild(fileB);
        rootNode.addChild(folder1);
        rootNode.addChild(fileE);
        rootNode.addChild(fileF);

        folder1.addChild(fileC);
        folder1.addChild(folder2);

        folder2.addChild(fileD);
};