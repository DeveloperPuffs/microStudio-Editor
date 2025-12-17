const loadedStylesheets = new Set();

export function loadStylesheet(path) {
        const url = new URL(path, import.meta.url);
        if (loadedStylesheets.has(url)) {
                return;
        }

        loadedStylesheets.add(url);

        const link = document.createElement("link");
        document.head.appendChild(link);

        link.rel = "stylesheet";
        link.href = url;

        return new Promise((resolve, reject) => {
                link.onload = resolve;
                link.onerror = reject;
        });
}