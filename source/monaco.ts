declare global {
        interface Window {
                require: any;
                monaco: typeof import("monaco-editor");
        }
}

export enum MonacoEvent {
        SAVE_FILE
}

const eventListenersMap = new Map<MonacoEvent, (() => void)[]>();

export function registerEventListener(event: MonacoEvent, listener: () => void) {
        const eventListeners = eventListenersMap.get(event) ?? [];
        eventListeners.push(listener);

        eventListenersMap.set(event, eventListeners);
}

export function removeEventListener(event: MonacoEvent, listener: () => void) {
        const eventListeners = eventListenersMap.get(event);
        if (eventListeners == undefined) {
                return;
        }

        const index = eventListeners.indexOf(listener);
        if (index === -1) {
                return;
        }

        eventListeners.splice(index, 1);
}

function triggerEvent(event: MonacoEvent) {
        const eventListeners = eventListenersMap.get(event);
        if (eventListeners === undefined) {
                return;
        }

        for (const eventListener of eventListeners) {
                eventListener();
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

        instance.addAction({
                id: "save-file",
                label: "Save File",
                keybindings: [
                        window.monaco.KeyMod.CtrlCmd |
                        window.monaco.KeyCode.KeyS
                ],
                precondition: null,
                keybindingContext: null,
                contextMenuGroupId: "navigation",
                contextMenuOrder: 1,
                run: () => triggerEvent(MonacoEvent.SAVE_FILE)
        });

        // A theme similar to the Ace editor theme microStudio uses
        window.monaco.editor.defineTheme("tomorrow-night-bright", {
                base: "vs-dark",
                inherit: true,
                rules: [
                        {
                                token: "keyword",
                                foreground: "#C397D8"
                        },
                        {
                                token: "operator",
                                foreground: "#70C0B1"
                        },
                        {
                                token: "number",
                                foreground: "E78C45"
                        },
                        {
                                token: "constant",
                                foreground: "E78C45"
                        },
                        {
                                token: "function",
                                foreground: "7AA6DA"
                        },
                        {
                                token: "variable",
                                foreground: "D54E53"
                        },
                        {
                                token: "type",
                                foreground: "E7C547"
                        },
                        {
                                token: "string",
                                foreground: "B9CA4A"
                        },
                        {
                                token: "comment",
                                foreground: "969896"
                        }
                ],
                colors: {
                        "editor.background": "#000000",
                        "editor.foreground": "#DEDEDE",
                        "editorCursor.foreground": "#9F9F9F",
                        "editor.selectionBackground": "#424242",
                        "editor.inactiveSelectionBackground": "#424242",
                        "editor.lineHighlightBackground": "#2A2A2A",
                        "editorLineNumber.activeForeground": "#DEDEDE",
                        "editorBracketMatch.border": "#888888",
                        "editor.foldBackground": "#7AA6DA33",
                        "editorIndentGuide.background": "#343434",
                        "editorIndentGuide.activeBackground": "#4A4A4A"
                }
        });

        window.monaco.editor.setTheme("tomorrow-night-bright");
}