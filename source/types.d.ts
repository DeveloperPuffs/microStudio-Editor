declare module "monaco-languages" {
        export function registerLanguages(languages: Array<any>): void;
}

declare module "*.html?raw" {
        const content: string;
        export default content;
}

declare module "*.css?inline" {
        const content: string;
        export default content;
}

declare module "*.json?raw" {
        const content: string;
        export default content;
}