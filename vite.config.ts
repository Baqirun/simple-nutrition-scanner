import tailwindcss from "@tailwindcss/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
    plugins: [
        tailwindcss(),
        paraglideVitePlugin({
            project: "./project.inlang",
            outdir: "./src/lib/paraglide",
            strategy: ["localStorage", "preferredLanguage", "globalVariable", "baseLocale"]
        }),
        sveltekit()
    ],
    server: {
        allowedHosts: ['.ts.net']
    },
    preview: {
        allowedHosts: ['.ts.net']
    },
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    }
});
