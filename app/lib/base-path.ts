/**
 * The path the site is served under: "/" by default, or e.g. "/canvasbio/" on GitHub Pages
 * (set with BASE_PATH at build time, see vite.config.ts and react-router.config.ts).
 * Router links handle it themselves; plain URLs (images, data, icons) and request
 * pathnames in loaders go through these helpers. Falls back to "/" outside Vite (scripts).
 */
export const BASE_PATH: string = import.meta.env?.BASE_URL ?? "/";

const prefix = BASE_PATH.replace(/\/$/, "");

/** A site path as served: withBase("/data/x.json") → "/canvasbio/data/x.json". */
export const withBase = (path: string) => prefix + path;

/** A served pathname as a site path: "/canvasbio/en/about" → "/en/about". */
export function withoutBase(pathname: string): string {
  if (!prefix || !pathname.startsWith(prefix)) return pathname;
  return pathname.slice(prefix.length) || "/";
}

/** The site path a loader is called for, without the base and the ".data" suffix of client navigations. */
export const requestPath = (request: Request) =>
  withoutBase(new URL(request.url).pathname).replace(/\.data$/, "");
