/**
 * Generates the site icons from site.config.ts (brand initials on the accent colour),
 * so every project from the template gets its own favicon, touch icon and web manifest.
 *
 *   npx tsx scripts/build-icons.ts
 *
 * Output: public/icons/{icon.svg,icon-192.png,icon-512.png,icon-maskable-512.png,apple-touch-icon.png}
 * and public/site.webmanifest.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { brandInitials } from "../app/lib/brand";
import siteConfig from "../site.config";

const OUT = path.resolve("public/icons");
const { colors, fonts } = siteConfig.theme;
const locale = siteConfig.defaultLocale;
const name = siteConfig.brand.name[locale]!;
const wordmark = siteConfig.brand.wordmark[locale]!;

/** The same monogram as in the navigation (app/lib/brand.ts). */
const initials = brandInitials(wordmark);

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** Square icon; `radius` rounds the corners (0 for maskable/touch icons, the OS shapes those). */
function svg({ radius, scale = 1 }: { radius: number; scale?: number }) {
  const size = 512;
  const fontSize = (initials.length > 1 ? 220 : 300) * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${colors.light.accent}"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="${escape(`${fonts.wordmark}, Arial, Helvetica, sans-serif`)}"
    font-weight="700" font-size="${fontSize}" letter-spacing="-0.04em" fill="${colors.light.accentForeground}">${escape(initials)}</text>
</svg>`;
}

await mkdir(OUT, { recursive: true });
const rounded = svg({ radius: 112 });
const square = svg({ radius: 0 });
// Maskable icons may be cropped to a circle: keep the letters inside the safe zone.
const maskable = svg({ radius: 0, scale: 0.8 });

const png = (source: string, size: number, file: string) =>
  sharp(Buffer.from(source)).resize(size, size).png().toFile(path.join(OUT, file));

await Promise.all([
  writeFile(path.join(OUT, "icon.svg"), rounded),
  png(rounded, 192, "icon-192.png"),
  png(rounded, 512, "icon-512.png"),
  png(maskable, 512, "icon-maskable-512.png"),
  png(square, 180, "apple-touch-icon.png"),
]);

const manifest = {
  name,
  short_name: name,
  description: siteConfig.brand.description[locale],
  lang: locale,
  start_url: "/",
  display: "browser",
  background_color: colors.light.page,
  theme_color: colors.light.page,
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
  ],
};
await writeFile(path.resolve("public/site.webmanifest"), JSON.stringify(manifest, null, 2));
console.log(`Icons: "${initials}" on ${colors.light.accent}`);
