import * as Adaper from "./adapter.ts";
import * as Manifest from "./mainfest.ts";
import * as Monaco from "./monaco.ts";
import * as Layout from "./layout.ts";
import * as Files from "./files.ts";
import * as Views from "./views.ts";
import * as Preview from "./preview.ts";

import html from "./plugin.html?raw";
import css from "./plugin.css?inline";

export async function initialize(pluginInterface: Adaper.PluginInterface) {
        const fontAwesomeScript = document.createElement("script");
        fontAwesomeScript.src = "https://kit.fontawesome.com/03b601dbb5.js";
        fontAwesomeScript.crossOrigin = "anonymous";
        fontAwesomeScript.defer = true;

        document.head.appendChild(fontAwesomeScript);

        const stylesheet = document.createElement("style");
        stylesheet.textContent = css;
        document.head.appendChild(stylesheet);

        const wrapper = document.createElement("main");
        wrapper.classList.add("wrapper");
        document.body.appendChild(wrapper);

        wrapper.innerHTML = html;

        Layout.initialize();
        Files.initialize();
        Preview.intialize();

        await Monaco.initialize();

        const fileViews = new Map<Files.FileNode, Views.View>();
        let currentView: Views.View | undefined;

        Files.registerEventListener(Files.FileEvent.FILE_OPENED, (file: unknown) => {
                if (!(file instanceof Files.FileNode)) {
                        return;
                }

                currentView?.dismiss();

                if (!fileViews.has(file)) {
                        const view = new Views.TextView(file);
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

        const rootNode = Files.getRootNode();
        const files = await Adaper.loadFiles(pluginInterface);

        // TODO: Use the "sprites/icon" file to make sure that the editor has access to the entire project
        // not just the editor/ subfolder because that file can't be deleted, renamed, or moved.

        // Maps the full paths of folders to their corresponding nodes
        const folderIndex = new Map<string, Files.FolderNode>();

        function ensureFolderExistence(file: Adaper.FileContext): Files.FolderNode | undefined {
                let currentPath = "";
                let parent: Files.FolderNode | undefined;

                for (const part of file.folders) {
                        currentPath = currentPath === "" ? part : `${currentPath}/${part}`;

                        let folder = folderIndex.get(currentPath);
                        if (folder === undefined) {
                                folder = new Files.FolderNode(part);
                                folderIndex.set(currentPath, folder);
                                (parent ?? rootNode).addChild(folder);
                        }

                        parent = folder;
                }

                return parent;
        }

        for (const file of files) {
                if (file.fullPath === Manifest.path) {
                        continue;
                }

                const parentFolder = ensureFolderExistence(file);
                if (parentFolder === undefined) {
                        continue;
                }

                const fileNode = new Files.FileNode(file);
                parentFolder.addChild(fileNode);
        }

        // load this asynchronously on startup
        Manifest.initialize(pluginInterface);
};