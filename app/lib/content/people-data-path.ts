import siteConfig from "../../../site.config";

/** URL of the static people data for a locale, e.g. "/data/people-de-ls.json". */
export const peopleDataPath = (locale: string) => `/data/people-${locale.toLowerCase()}.json`;

/** Inverse of peopleDataPath: the locale code for a data URL, or undefined. */
export function peopleDataLocale(pathname: string): string | undefined {
  return siteConfig.locales.find((l) => peopleDataPath(l.code) === pathname)?.code;
}
