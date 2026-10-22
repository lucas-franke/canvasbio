import { readdirSync } from "node:fs";

import type { Config } from "@react-router/dev/config";

import siteConfig from "./site.config";

/** Every person folder in content/people becomes a biography page in every locale. */
function biographyPaths(): string[] {
  const slugs = readdirSync("content/people", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  return siteConfig.locales.flatMap(({ code, prefix }) =>
    slugs.map((slug) => `/${[prefix, siteConfig.paths.people[code], slug].filter(Boolean).join("/")}`),
  );
}

export default {
  // Fully static site: every route is pre-rendered at build time and can be
  // served from any static host. Non-prerendered paths use the SPA fallback.
  ssr: false,
  // Same base path as in vite.config.ts (BASE_PATH, e.g. "/canvasbio/" on GitHub Pages).
  basename: process.env.BASE_PATH ?? "/",
  prerender: {
    paths: ({ getStaticPaths }) => [...getStaticPaths(), ...biographyPaths()],
    concurrency: 8,
  },
} satisfies Config;
