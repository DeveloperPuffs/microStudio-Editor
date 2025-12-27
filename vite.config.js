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
                                // drop_console: true,
                                drop_debugger: true
                        },
                        mangle: {
                                toplevel: true,
                                reserved: ["initialize"]
                        },
                        format: {
                                comments: false
                        }
                },

                lib: {
                        entry: "source/plugin.ts",
                        name: "window.Plugin",
                        formats: ["iife"],
                        fileName: () => "plugin.js"
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