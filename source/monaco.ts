declare global {
        interface Window {
                require: any;
                monaco: typeof import("monaco-editor");
        }
}

export const wrapper = document.createElement("div");
wrapper.classList.add("monaco-wrapper");

let instance: any | undefined;

export function getInstance() {
        return instance;
}

export async function setupMonaco() {
        await new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js";
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
        });

        await new Promise((resolve, reject) => {
                window.require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs" } });
                window.require(["vs/editor/editor.main"], resolve, reject);
        });

        instance = window.monaco.editor.create(wrapper, {
                automaticLayout: true,
                theme: "vs-dark"
        });
}