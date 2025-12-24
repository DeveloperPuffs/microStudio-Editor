import * as Modal from "./modal.ts";

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

export const roots = Object.freeze([
        "source",
        "sprites",
        "maps",
        "sounds",
        "music",
        "assets"
] as const);

// A more useful representation of a file based off of a full path
export abstract class FileContext {
        protected path: string;

        constructor(path: string) {
                this.path = path;
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
}

// This type of file is stored by serializing them into JSON
export class SourceFileContext extends FileContext {
        private source: string;

        constructor(path: string, source: string) {
                super(path);
                this.source = source;
        }

        getSource() {
                return this.source;
        }
        
        serialize(): string {
                // Use two space tabs to save space
                return JSON.stringify({path: this.path, content: this.source}, null, 2); 
        }

        static deserialize(input: string): SourceFileContext | undefined {
                let data: unknown;

                try {
                        data = JSON.parse(input);
                } catch (error) {
                        console.log(`Failed to parse file data: ${error}`);
                        return undefined;
                }

                if (typeof data !== "object" || data === null) {
                        return undefined;
                }

                const dataRecord = data as Record<string, unknown>;

                if (typeof dataRecord.path !== "string") {
                        // TODO: Also return undefined if the path is an invalid string
                        return undefined;
                }

                if (typeof dataRecord.content !== "string") {
                        return undefined;
                }

                return new SourceFileContext(dataRecord.path, dataRecord.content);
        }
}

// This type of file has content loaded lazily and saved using the plugin interface
export class ExternalFileContext extends FileContext {
        private pluginInterface: PluginInterface;

        constructor(path: string, pluginInterface: PluginInterface) {
                super(path);
                this.pluginInterface = pluginInterface;
        }

        private getPluginInterfacePath() {
                return `${this.folders.join("/")}/${this.baseName}`;
        }

        async readContent() {
                return new Promise<unknown>((resolve, reject) => {
                        const path = this.getPluginInterfacePath();
                        this.pluginInterface.readFile(path, (content, error) => {
                                if (error !== undefined) {
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
                                if (error !== undefined) {
                                        reject(error);
                                        return;
                                }

                                resolve(result);
                        });
                });
        }
}

export async function loadFiles(pluginInterface: PluginInterface) {
        const pluginFiles = await Promise.all<PluginFile[]>(roots.map(root => {
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
        }));

        const pendingSourceDeletions: string[] = [];

        const fileContextList = await Promise.all<FileContext>(pluginFiles.flat().map(pluginFile => {
                const fullPath = `${pluginFile.path}.${pluginFile.ext}`;

                return new Promise<FileContext>((resolve, reject) => {
                        if (pluginFile.path.split("/")[0] !== "source") {
                                const fileContext = new ExternalFileContext(fullPath, pluginInterface);
                                resolve(fileContext);
                                return;
                        }

                        // Source files need to be loaded right away
                        pluginInterface.readFile(pluginFile.path, (content, error) => {
                                if (error !== undefined) {
                                        reject(error);
                                        return;
                                }

                                pendingSourceDeletions.push(pluginFile.path);

                                const fileContext = new SourceFileContext(fullPath, content as string);
                                resolve(fileContext);
                        });
                });
        }));

        if (pendingSourceDeletions.length === 0) {
                return fileContextList;
        }

        const warningModal = new Modal.Modal({
                title: "Source Files will be Moved",
                body: `
                        This project contains source files that were not generated by the editor.
                        To make sure they are executed in order, all source files will be managed by the editor
                        and combined into a single script during runtime. Your code won't be lost.
                `,
                buttonOptions: [
                        { label: "Ok" }
                ]
        });

        await warningModal.prompt();

        // Don't need to wait for it to complete, just let them run simutaneously
        Promise.all(pendingSourceDeletions.map(pendingSourceDeletion => {
                return new Promise((resolve, reject) => {
                        pluginInterface.deleteFile(pendingSourceDeletion, (result, error) => {
                                if (error !== undefined) {
                                        reject(error);
                                        return;
                                }

                                resolve(result);
                        });
                });
        }))

        return fileContextList;
}