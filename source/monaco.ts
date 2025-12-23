import { editor as MonacoEditor } from "monaco-editor-core";
import { registerLanguages } from "monaco-languages";

import languages from "./languages.json?raw";

self.MonacoEnvironment = {
        getWorker(_, label) {
                if (label === "json") {
                        return new Worker(
                                new URL("monaco-editor/esm/vs/language/json/json.worker", import.meta.url),
                                { type: "module" }
                        );
                }

                if (label === "javascript" || label === "typescript") {
                        return new Worker(
                                new URL("monaco-editor/esm/vs/language/typescript/ts.worker", import.meta.url),
                                { type: "module" }
                        );
                }

                if (label === "markdown") {
                        return new Worker(
                                new URL("monaco-editor/esm/vs/language/markdown/markdown.worker", import.meta.url),
                                { type: "module" }
                        );
                }

                return new Worker(
                        new URL("monaco-editor/esm/vs/editor/editor.worker", import.meta.url),
                        { type: "module" }
                );
        }
};

const languageList = JSON.parse(languages);
registerLanguages(languageList);

export const monacoWrapper = document.createElement("div");
export const monacoInstance = MonacoEditor.create(monacoWrapper, {
        automaticLayout: true,
        theme: "vs-dark"
});