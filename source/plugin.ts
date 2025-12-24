import * as Adaper from "./adapter.ts";
import * as Files from "./files.ts";

export async function initialize(pluginInterface: Adaper.PluginInterface) {
        const files = await Adaper.loadFiles(pluginInterface);

        const pluginFile = files.find(file => {
                return file.fullPath === "assets/__editor" && file.extension === "json";
        });

        const rootNode = Files.getRootNode()!;

        // Maps the full paths of folders to their corresponding nodes\
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
                if (file === pluginFile) {
                        continue;
                }

                const parentFolder = ensureFolderExistence(file);
                if (parentFolder === undefined) {
                        continue;
                }

                const fileNode = new Files.FileNode(file);
                parentFolder.addChild(fileNode);
        }
}