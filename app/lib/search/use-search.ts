import { useMemo, useSyncExternalStore } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

import { siteConfig } from "~/lib/config";
import { useHydrated } from "~/lib/hooks";
import { useLocale } from "~/lib/i18n";
import { pagePath, parsePath } from "~/lib/i18n/locale";
import { emptySearch, parseSearch, searchSuffix, toSearchParams, type SearchState } from "./search";

/**
 * Current search from the URL. Empty while pre-rendered HTML hydrates (it was rendered
 * without query parameters), then the real state.
 */
export function useSearch(): SearchState {
  const [params] = useSearchParams();
  const hydrated = useHydrated();
  return useMemo(() => (hydrated ? parseSearch(params, siteConfig.facets) : emptySearch), [params, hydrated]);
}

/** "?…" to append to people links, so the search survives opening and closing a biography. */
export function useSearchSuffix(): string {
  return searchSuffix(useSearch(), siteConfig.facets);
}

/**
 * Applies a search: on the people pages it stays on the current page (overview or biography),
 * elsewhere it opens the people overview.
 */
export function useApplySearch() {
  const navigate = useNavigate();
  const locale = useLocale();
  const { pathname, search } = useLocation();
  return (state: SearchState) => {
    const onPeople = parsePath(pathname).page === "people";
    const params = toSearchParams(state, siteConfig.facets, new URLSearchParams(search));
    const query = params.toString();
    navigate(`${onPeople ? pathname : pagePath(locale, "people")}${query ? `?${query}` : ""}`, {
      preventScrollReset: onPeople,
    });
  };
}

/* Open state of the search panel, shared by the nav button and "Change search". */
let open = false;
const listeners = new Set<() => void>();

export function setSearchPanelOpen(value: boolean) {
  open = value;
  for (const listener of listeners) listener();
}

export function useSearchPanelOpen(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open,
    () => false,
  );
}
