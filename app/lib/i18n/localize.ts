import { siteConfig } from "~/lib/config";

/** Picks the string for a locale from a `{ de: "…", en: "…" }` record. */
export function localize(record: Record<string, string>, locale: string): string {
  const value = record[locale] ?? record[siteConfig.defaultLocale];
  if (value === undefined) {
    throw new Error(`Kein Text für Locale "${locale}" in ${JSON.stringify(record)}`);
  }
  return value;
}

export function htmlLangFor(locale: string): string {
  return siteConfig.locales.find((l) => l.code === locale)?.htmlLang ?? locale;
}
