import { defineConfig } from "vite";

export default defineConfig({
    build: {
        outDir: "build",
        cssCodeSplit: false,
        sourcemap: false,

        minify: "terser",
        terserOptions: {
            compress: {
                passes: 3,
                drop_console: true,
                drop_debugger: true
            },
            mangle: {
                toplevel: true,
                reserved: ["setupEditor"]
            },
            format: {
                comments: false
            }
        },

        lib: {
            entry: "source/editor.js",
            name: "window.Editor",
            formats: ["iife"],
            fileName: () => "editor.js"
        },

        rollupOptions: {
            treeshake: true,
            output: {
                inlineDynamicImports: true,
                compact: true
            }
        }
    }
});