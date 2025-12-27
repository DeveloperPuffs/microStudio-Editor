import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
        if (mode !== "debug" && mode !== "release") {
                throw new Error("You have to explicitly choose a build mode between debug or release.");
        }

        return {
                build: {
                        outDir: "build",
                        cssCodeSplit: false,
                        sourcemap: false,

                        minify: mode === "release" ? "terser" : false,
                        terserOptions: mode === "debug" ? {} : {
                                compress: {
                                        passes: 3,
                                        drop_console: true,
                                        drop_debugger: true,
                                },
                                mangle: {
                                        toplevel: true,
                                        reserved: ["initialize"],
                                },
                                format: {
                                        comments: false,
                                },
                        },

                        lib: {
                                entry: "source/plugin.ts",
                                name: "window.Plugin",
                                formats: ["iife"],
                                fileName: () => `plugin_${mode}.js`,
                        },

                        rollupOptions: {
                                treeshake: mode === "release",
                                output: {
                                        inlineDynamicImports: true,
                                        compact: mode === "release",
                                },
                        },
                },
        };
});