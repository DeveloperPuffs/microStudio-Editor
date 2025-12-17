import { loadStylesheet } from "./stylesheets.js";
import { setupEditorLayout } from "./layout.js";

export async function createEditor(container) {
        await loadStylesheet("./editor.css");

        const url = new URL("./editor.html", import.meta.url);
        const response = await fetch(url);
        const html = await response.text();
        container.innerHTML = html;

        const editor = container.querySelector("#editor");
        setupEditorLayout(editor);
};