const fileStore = new Map();

function addMockFile(fullPath, content) {
        const lastSlash = fullPath.lastIndexOf("/");
        const lastDot = fullPath.lastIndexOf(".");

        if (lastDot === -1 || lastDot < lastSlash) {
                throw new Error(`Invalid file path "${fullPath}". Expected an extension.`);
        }

        const path = fullPath.slice(0, lastDot);
        const ext = fullPath.slice(lastDot + 1);
        const name = path.slice(path.lastIndexOf("/") + 1);
        const size = typeof content === "string"
                ? content.length
                : JSON.stringify(content).length;

        fileStore.set(`${path}.${ext}`, {name, path, ext, content, size});
}

addMockFile("source/main.js", `
function hello() {
        return "Hello from main";
}
`);

addMockFile("source/utils/math.js", `
export function add(a, b) {
        return a + b;
}
`);

addMockFile("source/script.ms", `
init = function()
        print("Hello from microScript")
end
`);

addMockFile("assets/__editor.json", {
        indentType: "spaces",
        indentSize: 8,
        username: "PlasmaPuffs",
        projectSlug: "secret_game",
        projectSecretCode: "ABCD1234"
});

export const PluginInterface = Object.freeze({
        listFiles(root, callback) {
                const list = [];

                for (const file of fileStore.values()) {
                        if (!file.path.startsWith(root + "/") && file.path !== root) {
                                continue;
                        }

                        list.push(file);
                }

                queueMicrotask(() => callback(list));
        },

        readFile(path, callback) {
                const entry = [...fileStore.values()].find(file => file.path === path);
                if (!entry) {
                        queueMicrotask(() => callback(undefined, "File not found"));
                        return;
                }

                queueMicrotask(() => callback(entry.content));
        },

        writeFile(path, content, options, callback) {
                const ext = options.ext || "txt";
                const key = `${path}.${ext}`;

                if (options.replace === "false" && fileStore.has(key)) {
                        queueMicrotask(() => callback(undefined, "File already exists"));
                        return;
                }

                fileStore.set(key, {path, ext, content});
                queueMicrotask(() => callback(content));
        },

        deleteFile(path, callback) {
                let deleted = false;

                for (const key of fileStore.keys()) {
                        if (key.startsWith(path + ".")) {
                                fileStore.delete(key);
                                deleted = true;
                        }
                }

                queueMicrotask(() => callback(deleted ? 1 : 0, deleted ? undefined : "File not found"));
        }
});