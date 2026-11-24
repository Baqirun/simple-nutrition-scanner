import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
    plugins: [
        paraglideVitePlugin({
            project: "./project.inlang",
            outdir: "./src/lib/paraglide",
            strategy: ["localStorage", "preferredLanguage", "globalVariable", "baseLocale"]
        }),
        sveltekit()
    ],
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        setupFiles: ["./tests/setup.ts"],
    },
});
