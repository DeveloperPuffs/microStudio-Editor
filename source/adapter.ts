// A file in the format microStudio gives
type PluginFile = {
        // The name of the file without the extension
        name: string;
        // The path of the file without the extension
        path: string;
        // The extension of the file
        ext: string;
        // The size of the file (in characters?)
        size: number;
};

type FileWriteOptions = {
        // Whether an existing file with the same name should be overwritten
        replace: "true" | "false";
        // The extension of the file
        ext: string;
};

// TODO: I could investigate a bit to find out the type of the 'result' from writing or deleting files
type FileOperationResult = unknown;

type ListFilesCallback = (list: PluginFile[], error?: string) => void;
type ReadFileCallback = (content: unknown, error?: string) => void;
type WriteFileCallback = (result: FileOperationResult, error?: string) => void;
type DeleteFileCallback = (result: FileOperationResult, error?: string) => void;

// The equivalent to system.project, which is used to access and modify project files
export interface PluginInterface {
        listFiles: (root: string, callback: ListFilesCallback) => void;
        readFile: (path: string, callback: ReadFileCallback) => void;
        writeFile: (path: string, content: unknown, options: FileWriteOptions, callback: WriteFileCallback) => void;
        deleteFile: (path: string, callback: DeleteFileCallback) => void;
}

export const roots: readonly string[] = Object.freeze([
        "source",
        "sprites",
        "maps",
        "sounds",
        "music",
        "assets"
] as const);

// A more useful representation of a file based off of a full path
// It can be used to read and write the corresponding file
export class FileContext {
        private pluginInterface: PluginInterface;
        private path: string;
        private _exists: boolean;

        constructor(pluginInterface: PluginInterface, path: string, exists: boolean) {
                this.pluginInterface = pluginInterface;
                this.path = path;
                this._exists = exists;
        }

        get exists() {
                return this._exists;
        }

        private set exists(exists) {
                this._exists = exists;
        }

        get folders(): string[] {
                const folderParts = this.path.split("/");
                return folderParts.slice(0, -1);
        }

        get fullPath(): string {
                return this.path;
        }

        get fullName(): string {
                const folderParts = this.path.split("/");
                return folderParts[folderParts.length - 1];
        }

        get baseName(): string {
                const index = this.fullName.lastIndexOf(".");
                return index === -1 ? this.fullName : this.fullName.slice(0, index);
        }

        get extension(): string {
                const nameParts = this.fullName.split(".");
                return nameParts[nameParts.length - 1];
        }

        private getPluginInterfacePath() {
                return `${this.folders.join("/")}/${this.baseName}`;
        }

        async readContent() {
                if (!this.exists) {
                        return undefined;
                }

                return new Promise<unknown>((resolve, reject) => {
                        const path = this.getPluginInterfacePath();
                        this.pluginInterface.readFile(path, (content, error) => {
                                if (error) {
                                        console.log(`Failed to read file content for "${path}": ${error}`);
                                        reject(error);
                                        return;
                                }

                                resolve(content);
                        });
                });
        }

        async writeContent(content: unknown) {
                return new Promise<FileOperationResult>((resolve, reject) => {
                        const path = this.getPluginInterfacePath();
                        const options: FileWriteOptions = {
                                replace: "true",
                                ext: this.extension
                        };

                        this.pluginInterface.writeFile(path, content, options, (result, error) => {
                                if (error) {
                                        console.log(`Failed to write file content for "${path}": ${error}`);
                                        reject(error);
                                        return;
                                }

                                this.exists = true;
                                resolve(result);
                        });
                });
        }
}

async function loadRoot(pluginInterface: PluginInterface, root: string) {
        if (!roots.includes(root)) {
                return [];
        }

        return new Promise<PluginFile[]>((resolve, _) => {
                pluginInterface.listFiles(root, (list, error) => {
                        if (error !== undefined) {
                                console.log(`Failed to list files for root \"${root}\": ${error}`);
                                resolve([]);
                                return;
                        }

                        resolve(list);
                });
        });
}

export async function loadFiles(pluginInterface: PluginInterface) {
        const pluginFiles = await Promise.all<PluginFile[]>(roots.map(root => {
                return loadRoot(pluginInterface, root);
        }));

        return pluginFiles.flat().map(pluginFile => {
                const fullPath = `${pluginFile.path}.${pluginFile.ext}`;
                return new FileContext(pluginInterface, fullPath, true);
        });
}

export async function findFile(pluginInterface: PluginInterface, path: string) {
        const parts = path.split("/");
        if (parts.length === 0) {
                return undefined;
        }

        const pluginFiles = await loadRoot(pluginInterface, parts[0]);
        const foundFile = pluginFiles.find(pluginFile => {
                const fullPath = `${pluginFile.path}.${pluginFile.ext}`;
                return fullPath === path;
        });

        if (foundFile === undefined) {
                return undefined;
        }

        const fileContext = new FileContext(pluginInterface, path, true);
        return fileContext;
}

export async function createFile(pluginInterface: PluginInterface, path: string) {
        const parts = path.split("/");
        if (parts.length === 0) {
                return undefined;
        }

        if (!roots.includes(parts[0])) {
                return undefined;
        }

        const foundFile = await findFile(pluginInterface, path);
        if (foundFile !== undefined) {
                return foundFile;
        }

        return new FileContext(pluginInterface, path, false);
}