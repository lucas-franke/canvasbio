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
 * .br/.gz files are left out, Pages compresses on its own. With siteUrl set, a sitemap and
 * robots.txt are added.
 */
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import siteConfig from "../site.config";

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

// Sitemap of every pre-rendered page (search engines), and robots.txt pointing to it.
// Needs the public address; the style guide is for the team, not for search results.
if (siteConfig.siteUrl) {
  const pages: string[] = [];
  const walk = async (dir: string, url: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        if (entry.name === "index.html") pages.push(url);
        continue;
      }
      if (url === "/" && ["assets", "data", "icons", "map", "portraits", "styleguide"].includes(entry.name))
        continue;
      await walk(path.join(dir, entry.name), `${url}${entry.name}/`);
    }
  };
  await walk(OUT, "/");
  const site = new URL(`/${base ? `${base}/` : ""}`, siteConfig.siteUrl);
  const urls = pages.sort().map((page) => `  <url><loc>${new URL(page.slice(1), site).href}</loc></url>`);
  await writeFile(
    path.join(OUT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
  );
  await writeFile(
    path.join(OUT, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap.xml", site).href}\n`,
  );
  console.log(`Sitemap: ${pages.length} pages`);
}
console.log(`GitHub Pages site in build/pages (base "/${base}")`);
