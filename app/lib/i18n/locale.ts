import { siteConfig } from "~/lib/config";
import type { SiteConfig } from "~/lib/config/schema";

export type Page = "start" | "people" | "about" | "accessibility" | "imprint" | "privacy";

/** Text pages from content/pages, rendered by routes/page.tsx. */
export const TEXT_PAGES = ["about", "accessibility", "imprint", "privacy"] as const;
export type TextPage = (typeof TEXT_PAGES)[number];

export interface ParsedPath {
  locale: string;
  page: Page | null;
  /** Segments after the page segment, e.g. [slug, tabSlug] on a person page. */
  rest: string[];
}

const segmentsOf = (pathname: string) => pathname.split("/").filter(Boolean).map(decodeURIComponent);

/** Locale of a URL: the first segment if it is a locale prefix, else the default locale. */
export function localeFromPathname(pathname: string, config: SiteConfig = siteConfig): string {
  const first = segmentsOf(pathname)[0];
  const match = config.locales.find((l) => l.prefix !== "" && l.prefix === first);
  return match?.code ?? config.defaultLocale;
}

export function parsePath(pathname: string, config: SiteConfig = siteConfig): ParsedPath {
  const locale = localeFromPathname(pathname, config);
  const prefix = config.locales.find((l) => l.code === locale)!.prefix;
  const segments = segmentsOf(pathname).slice(prefix ? 1 : 0);
  if (segments.length === 0) return { locale, page: "start", rest: [] };

  const [first, ...rest] = segments;
  for (const page of ["people", ...TEXT_PAGES] as const) {
    if (config.paths[page][locale] === first) return { locale, page, rest };
  }
  return { locale, page: null, rest: segments };
}

/** URL of a page in a locale, e.g. pagePath("en", "people", "hedwig-dohm") → "/en/people/hedwig-dohm". */
export function pagePath(locale: string, page: Page, ...rest: string[]): string {
  return pathFor(siteConfig, locale, page, rest);
}

/** URL of the list view, e.g. "/personen/liste" or "/en/people/list". */
export function listPath(locale: string): string {
  return pathFor(siteConfig, locale, "people", [siteConfig.paths.list[locale]]);
}

/** Whether a pathname is the list view of the people page. */
export function isListPath(pathname: string, config: SiteConfig = siteConfig): boolean {
  const { locale, page, rest } = parsePath(pathname, config);
  return page === "people" && rest.length === 1 && rest[0] === config.paths.list[locale];
}

function pathFor(config: SiteConfig, locale: string, page: Page, rest: string[] = []): string {
  const prefix = config.locales.find((l) => l.code === locale)?.prefix ?? "";
  const pageSegment = page === "start" ? [] : [config.paths[page][locale]];
  const segments = [prefix, ...pageSegment, ...rest].filter(Boolean).map(encodeURIComponent);
  return `/${segments.join("/")}`;
}

/**
 * The same page in another locale, keeping person slug and detail tab
 * (whose URL segment is translated). Unknown pages fall back to the start page.
 */
export function switchLocalePath(pathname: string, target: string, config: SiteConfig = siteConfig): string {
  const { locale, page, rest } = parsePath(pathname, config);
  if (!page) return pathFor(config, target, "start");

  const translated = [...rest];
  if (page === "people" && translated[0] === config.paths.list[locale]) {
    translated[0] = config.paths.list[target];
  }
  return pathFor(config, target, page, translated.filter(Boolean));
}

/**
 * The URL hash in another language: biography tabs have translated names
 * ("#lebenslauf" ↔ "#timeline"); any other hash is kept as it is.
 */
export function switchLocaleHash(
  hash: string,
  from: string,
  target: string,
  config: SiteConfig = siteConfig,
): string {
  const name = hash.replace(/^#/, "");
  if (!name) return "";
  const tab = config.detail.tabs.find((t) => t.slug[from] === name);
  if (!tab) return hash;
  return tab.slug[target] ? `#${tab.slug[target]}` : "";
}

export function localeConfig(code: string, config: SiteConfig = siteConfig) {
  return (
    config.locales.find((l) => l.code === code) ??
    config.locales.find((l) => l.code === config.defaultLocale)!
  );
}
