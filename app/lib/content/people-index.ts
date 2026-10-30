import { useCallback, useEffect, useState } from "react";
import { useMatches } from "react-router";

import { withBase } from "~/lib/base-path";
import type { FacetLabels } from "~/lib/search/search";
import type { PersonListItem, PlaceCoords } from "./adapter";
import { peopleDataPath } from "./people-data-path";

export { peopleDataLocale, peopleDataPath } from "./people-data-path";

export interface PeopleIndex {
  people: PersonListItem[];
  /** Facet whose values are shown as tags (first "multi" facet), if any. */
  tagFacet?: string;
  tagLabels: Record<string, string>;
  /** Labels of all facet values (search filters, place suggestions). */
  facetLabels: FacetLabels;
  /** Coordinates of birth and death places (map view). */
  placeCoords: PlaceCoords;
  /** Continents with their countries (place keys), sorted by name: the place suggestions. */
  placeGroups?: { key: string; countries: string[] }[];
}

export interface PeopleIndexState {
  /** The data, or undefined while loading or after an error. */
  index: PeopleIndex | undefined;
  /** Loading the data failed (network, server); `retry` tries again. */
  failed: boolean;
  retry: () => void;
}

const isPeopleIndex = (data: unknown): data is PeopleIndex =>
  typeof data === "object" &&
  data !== null &&
  Array.isArray((data as PeopleIndex).people) &&
  typeof (data as PeopleIndex).facetLabels === "object";

const cache = new Map<string, PeopleIndex>();

/**
 * People overview data for the current locale. Uses the loader data of an overview route
 * when present (pre-rendered pages), otherwise the static JSON file — fetched once and
 * cached for the session.
 */
export function usePeopleIndex(locale: string): PeopleIndexState {
  const fromRoute = useMatches()
    .map((m) => m.loaderData)
    .find(isPeopleIndex);
  // The cache is browser-only: pre-rendering runs all pages in one process and must not
  // leak overview data into pages that don't load it (HTML size, hydration mismatch).
  const isBrowser = typeof document !== "undefined";
  if (isBrowser && fromRoute) cache.set(locale, fromRoute);
  const cached = isBrowser ? cache.get(locale) : undefined;

  const [fetched, setFetched] = useState<PeopleIndex | undefined>(cached);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (fromRoute || cache.has(locale)) return;
    let cancelled = false;
    fetch(withBase(peopleDataPath(locale)))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: PeopleIndex) => {
        cache.set(locale, data);
        if (!cancelled) setFetched(data);
      })
      .catch((error) => {
        console.error("Could not load the people overview", error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [locale, fromRoute, attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  return { index: fromRoute ?? cached ?? fetched, failed, retry };
}
