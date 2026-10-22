/**
 * Arranges build/client for GitHub Pages in build/pages (used by .github/workflows/deploy.yml).
 *
 *   BASE_PATH=/canvasbio/ npm run build && tsx scripts/prepare-pages.ts
 *
 * With a base path, React Router writes the pre-rendered pages to build/client/<base>/
 * and the SPA fallback to build/client/index.html, while Vite's assets stay at the root.
 * Pages serves the artifact under /<repo>/, so everything moves to one level:
 * pages and assets side by side, the fallback as 404.html (Pages has no rewrites;
 * unknown URLs get it and the app renders them in the browser). The pre-compressed
 * .br/.gz files are left out, Pages compresses on its own.
 */
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE = path.resolve("build/client");
const OUT = path.resolve("build/pages");
const base = (process.env.BASE_PATH ?? "/").replace(/^\/|\/$/g, "");

const skipCompressed = (file: string) => !/\.(br|gz)$/.test(file);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const entry of await readdir(SOURCE)) {
  if (base && entry === base) continue;
  // Without a base path the fallback has its own name; with one it is the root index.html.
  if (base && entry === "index.html") continue;
  await cp(path.join(SOURCE, entry), path.join(OUT, entry), { recursive: true, filter: skipCompressed });
}
if (base) {
  await cp(path.join(SOURCE, base), OUT, { recursive: true, filter: skipCompressed });
  await cp(path.join(SOURCE, "index.html"), path.join(OUT, "404.html"));
} else {
  await cp(path.join(SOURCE, "__spa-fallback.html"), path.join(OUT, "404.html"));
}
// Jekyll would drop files starting with "_" (e.g. "_.data", the start page's data).
await writeFile(path.join(OUT, ".nojekyll"), "");
console.log(`GitHub Pages site in build/pages (base "/${base}")`);
