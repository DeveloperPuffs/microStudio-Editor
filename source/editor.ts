import * as Plugin from "./plugin.ts";
import * as Adaper from "./adapter.ts";
import * as Monaco from "./monaco.ts";
import * as Layout from "./layout.ts";
import * as Files from "./files.ts";
import * as Preview from "./preview.ts";
import * as Views from "./views.ts";

import html from "./editor.html?raw";
import css from "./editor.css?inline";

export async function setupEditor(container: HTMLElement, pluginInterface: Adaper.PluginInterface) {
        await Monaco.setupMonaco();

        const fontAwesomeScript = document.createElement("script");
        fontAwesomeScript.src = "https://kit.fontawesome.com/03b601dbb5.js";
        fontAwesomeScript.crossOrigin = "anonymous";
        fontAwesomeScript.defer = true;

        document.head.appendChild(fontAwesomeScript);

        const stylesheet = document.createElement("style");
        stylesheet.textContent = css;
        document.head.appendChild(stylesheet);

        container.innerHTML = html;

        Layout.initialize();
        Files.initialize();
        Preview.intialize();

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

        await Plugin.initialize(pluginInterface);
};