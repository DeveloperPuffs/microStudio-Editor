import * as Adaper from "./adapter.ts";
import * as Files from "./files.ts";

let manifestFile: Adaper.FileContext;
export const path = "assets/__editor.json";

export async function initialize(pluginInterface: Adaper.PluginInterface) {
        manifestFile = (await Adaper.createFile(pluginInterface, path, "{}"))!;
}