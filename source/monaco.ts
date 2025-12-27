declare global {
        interface Window {
                require: any;
                monaco: typeof import("monaco-editor");
        }
}

export {};

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

export async function initialize() {
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
                theme: "vs-dark",
                fontSize: 12
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

        // Nice: https://github.com/pmgl/microstudio/blob/a3bbdfe38c44928237d47f28be28a77a6cddf30b/static/lib/ace/mode-microscript.js
        window.monaco.languages.register({id: "microscript"});

        const INDENT_REGEX = /function\s*\(.*\)\s*$|^\s*(if|while|for|object|class|then)\b.*$/;
        const DEDENT_REGEX = /^\s*end\b/;

        window.monaco.languages.setMonarchTokensProvider("microscript", {
                tokenizer: {
                        root: [
                                [
                                        /\/\/.*/,
                                        "comment"
                                ],
                                [
                                        /\/\*/,
                                        {
                                                token: "comment",
                                                next: "@commentBlock"
                                        }
                                ],
                                [
                                        /".*?"|'[^']*'/,
                                        "string"
                                ],
                                [
                                        /\b(continue|break|else|elsif|end|for|by|function|if|in|to|local|return|then|while|or|and|not|object|class|extends|new|this|super|global)\b/,
                                        "keyword"
                                ],
                                [
                                        /\b(true|false)\b/,
                                        "type"
                                ],
                                [
                                        /\b(print|time|type|log|max|PI|pow|random|ceil|round|floor|abs|sqrt|min|exp|sin|atan|concat|sort|cos|tan|acos|asin|atan2|sind|cosd|tand|acosd|asind|atand|atan2d)\b/,
                                        "function"
                                ],
                                [
                                        /\b(screen|system|audio|gamepad|keyboard|touch|mouse)\b/,
                                        "variable"
                                ],
                                [
                                        /\+|\-|\*|\/|%|\^|<|>|<=|>=|==|=/,
                                        "operator"
                                ],
                                [
                                        /\d+(\.\d+)?/,
                                        "number"
                                ]
                        ],
                        commentBlock: [
                                [
                                        /\*\//,
                                        {
                                                token: "comment",
                                                next: "@pop"
                                        }
                                ],
                                [
                                        /./,
                                        "comment"
                                ]
                        ]
                }
        });
        
        const pairs = [
                { open: "{", close: "}" },
                { open: "[", close: "]" },
                { open: "(", close: ")" },
                { open: "\"", close: "\"" },
                { open: "'", close: "'" },
                { open: "/*", close: "*/" }
        ];

        window.monaco.languages.setLanguageConfiguration("microscript", {
                autoClosingPairs: pairs,
                surroundingPairs: pairs,
                comments: {
                        lineComment: "//",
                        blockComment: ["/*", "*/"]
                },
                brackets: [
                        ["{", "}"],
                        ["[", "]"],
                        ["(", ")"]
                ]
        });

        // TODO: The indent and dedent logic below only tests line by line
        // Lines with multiple indents or dedents only count as one.
        // This might need to be fixed later.

        // This custom folding behavior folds until the matching 'end' line
        window.monaco.languages.registerFoldingRangeProvider("microscript", {
                provideFoldingRanges(model, _context, _token) {
                        const ranges = [];
                        const indentStack: number[] = [];

                        for (let lineIndex = 1; lineIndex <= model.getLineCount(); ++lineIndex) {
                                const lineText = model.getLineContent(lineIndex).trim();

                                if (lineText === "") {
                                        continue;
                                }

                                if (INDENT_REGEX.test(lineText)) {
                                        indentStack.push(lineIndex);
                                        continue;
                                }

                                if (DEDENT_REGEX.test(lineText) && indentStack.length > 0) {
                                        const startLine = indentStack.pop();
                                        if (startLine !== undefined) {
                                                ranges.push({
                                                        start: startLine,
                                                        end: lineIndex - 1,
                                                        kind: window.monaco.languages.FoldingRangeKind.Region
                                                });
                                        }
                                }
                        }

                        return ranges;
                }
        });

        // Logic for indenting and adding indents and 'end' lines
        instance.addCommand(window.monaco.KeyCode.Enter, function() {
                const model = instance.getModel();
                if (!model || model.getLanguageId() !== "microscript") {
                        instance.trigger("keyboard", "type", { text: "\n" });
                        return;
                }
                
                // TODO: This behavior should probably also be disabled inside comments,
                // but I tried and idk how I would be able to easily do that.

                const position = instance.getPosition();
                const lineText = model.getLineContent(position.lineNumber);
                if (position.column <= lineText.trimEnd().length ||!INDENT_REGEX.test(lineText.trim())) {
                        instance.trigger("keyboard", "type", { text: "\n" });
                        return;
                }
                
                let indentDepth = 0;
                let endTokenFound = false;
                for (let lineIndex = 1; lineIndex <= model.getLineCount(); ++lineIndex) {
                        if (lineIndex === position.lineNumber) {
                                continue;
                        }

                        const lineText = model.getLineContent(lineIndex).trim();
                        if (lineText === "") {
                                continue;
                        }

                        if (INDENT_REGEX.test(lineText)) {
                                ++indentDepth;
                                continue;
                        }
                        
                        if (DEDENT_REGEX.test(lineText)) {
                                if (indentDepth === 0) {
                                        endTokenFound = true;
                                        break;
                                }

                                --indentDepth;
                                continue;
                        }
                }

                const indentMatch = lineText.match(/^\s*/);
                const indent = indentMatch ? indentMatch[0] + "\t" : "\t";
                const parentIndent = indentMatch ? indentMatch[0] : "";
                const insertedText = endTokenFound ? `\n${indent}` : `\n${indent}\n${parentIndent}end`;

                instance.executeEdits("auto-end", [{
                        range: new window.monaco.Range(position.lineNumber, lineText.length + 1, position.lineNumber, lineText.length + 1),
                        text: insertedText
                }]);
                
                const caretPosition = Object.freeze({
                        lineNumber: position.lineNumber + 1,
                        column: indent.length + 1
                } as const);

                instance.setPosition(caretPosition);
                instance.revealPosition(caretPosition);
        });
}