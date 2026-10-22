import path from "node:path";
import { fileURLToPath } from "node:url";

import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

import siteConfig from "./site.config.ts";

/** Routes `import { cn } from "cn"` (used by shadcn components) to the project-configured merger. */
export const cnAlias = {
  find: /^cn$/,
  replacement: fileURLToPath(new URL("./app/lib/cn.ts", import.meta.url)),
};

const SITE_CONFIG_FILE = path.resolve(fileURLToPath(new URL("./site.config.ts", import.meta.url)));
const SITE_CONFIG_JSON = "\0site-config.json.js";

/**
 * site.config.ts is validated with Zod when it is loaded (here, while pre-rendering and in
 * the scripts). The browser only needs the result: this plugin replaces the module in the
 * client bundle with the validated config as plain data, which keeps Zod (~95 KB) out of it.
 */
function siteConfigAsData(): Plugin {
  return {
    name: "canvasbio:site-config-as-data",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (options?.ssr || !/site\.config(\.ts)?$/.test(source)) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved && path.resolve(resolved.id.split("?")[0]!) === SITE_CONFIG_FILE
        ? SITE_CONFIG_JSON
        : null;
    },
    load(id) {
      return id === SITE_CONFIG_JSON ? `export default ${JSON.stringify(siteConfig)};` : null;
    },
  };
}

export default defineConfig({
  // Path the site is served under, e.g. BASE_PATH=/canvasbio/ for GitHub Pages (default "/").
  base: process.env.BASE_PATH ?? "/",
  plugins: [siteConfigAsData(), tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
    alias: [cnAlias],
  },
});
