import { useLocation } from "react-router";

import { siteConfig } from "~/lib/config";
import { localeFromPathname } from "./locale";
import { de, type Messages } from "./messages/de";
import { en } from "./messages/en";

/** UI strings per locale code. A project adding a locale adds a messages file here. */
const catalogs: Record<string, Messages> = { de, en };

export function messagesFor(locale: string): Messages {
  return catalogs[locale] ?? catalogs[siteConfig.defaultLocale];
}

/** Current locale, derived from the URL so it is identical during prerendering and in the browser. */
export function useLocale(): string {
  return localeFromPathname(useLocation().pathname);
}

export function useMessages(): Messages {
  return messagesFor(useLocale());
}

export type { Messages };
