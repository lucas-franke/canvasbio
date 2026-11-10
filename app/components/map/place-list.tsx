import { cn } from "cn";
import { ChevronRight, Search } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { useLocale, useMessages } from "~/lib/i18n";
import { normalize } from "~/lib/search/search";

/** A place on the map with the people shown there. */
export interface MapPlace {
  key: string;
  label: string;
  slugs: string[];
}

interface PlaceListProps {
  places: MapPlace[];
  /** Continents with their countries (place keys), as in the place field of the search. */
  groups: { key: string; countries: string[] }[];
  /** Country of each place (place keys); places without one go under "other places". */
  countryOf: Record<string, string>;
  labels: Record<string, string>;
  onChoose: (place: MapPlace) => void;
}

interface Country {
  key: string;
  label: string;
  places: MapPlace[];
  count: number;
}

const countOf = (places: MapPlace[]) => new Set(places.flatMap((p) => p.slugs)).size;

/**
 * The list of places next to the map, the way around it: continents with their countries
 * and the places in each, alphabetical, with how many people each has (as in the place field
 * of the search panel). Each level opens in place (native disclosure). Typing in the field
 * above narrows it to the matching places.
 */
export function PlaceList({ places, groups, countryOf, labels, onChoose }: PlaceListProps) {
  const m = useMessages();
  const locale = useLocale();
  const id = useId();
  const [query, setQuery] = useState("");
  const byName = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, locale);

  const { continents, others } = useMemo(() => {
    const inCountry = new Map<string, MapPlace[]>();
    const others: MapPlace[] = [];
    for (const place of places) {
      const country = countryOf[place.key];
      if (country) inCountry.set(country, [...(inCountry.get(country) ?? []), place]);
      else others.push(place);
    }
    const country = (key: string): Country | null => {
      const list = inCountry.get(key);
      if (!list) return null;
      const sorted = [...list].sort(byName);
      return { key, label: labels[key] ?? key, places: sorted, count: countOf(sorted) };
    };
    const placed = new Set(groups.flatMap((g) => g.countries));
    // Countries the regions don't list (rare) go with the other places.
    for (const [key, list] of inCountry) if (!placed.has(key)) others.push(...list);
    const continents = groups
      .map((g) => {
        const countries = g.countries.map(country).filter((c): c is Country => c !== null);
        return {
          key: g.key,
          label: labels[g.key] ?? g.key,
          countries,
          count: countOf(countries.flatMap((c) => c.places)),
        };
      })
      .filter((c) => c.countries.length > 0);
    return { continents, others: others.sort(byName) };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- byName only depends on the locale
  }, [places, groups, countryOf, labels, locale]);

  const q = normalize(query.trim());
  const matches = useMemo(
    () => (q ? places.filter((p) => normalize(p.label).includes(q)).sort(byName) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- byName only depends on the locale
    [places, q, locale],
  );

  const placeButton = (place: MapPlace, context?: string) => (
    <li key={place.key}>
      <button
        type="button"
        onClick={() => onChoose(place)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-body-sm text-emphasis hover:bg-emphasis/5"
      >
        <span className="min-w-0">
          {place.label}
          {context && <span className="text-muted-text"> · {context}</span>}
        </span>
        <span className="text-body-xs text-muted-text tabular-nums">
          <span aria-hidden="true">{place.slugs.length}</span>
          <span className="sr-only">{m.search.peopleCount(place.slugs.length)}</span>
        </span>
      </button>
    </li>
  );

  const summaryClass =
    "flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-2 text-emphasis hover:bg-emphasis/5 [&::-webkit-details-marker]:hidden";
  // Each level has its own group name: an open continent must not turn the chevrons of its
  // closed countries.
  const chevron = (level: "continent" | "country") => (
    <ChevronRight
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 text-muted-text transition-transform motion-reduce:transition-none",
        level === "continent" ? "group-open/continent:rotate-90" : "group-open/country:rotate-90",
      )}
    />
  );
  const count = (n: number) => (
    <span className="ml-auto text-body-xs font-normal text-muted-text tabular-nums">
      <span aria-hidden="true">{n}</span>
      <span className="sr-only">, {m.search.peopleCount(n)}</span>
    </span>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 px-1 pt-1">
        <label htmlFor={`${id}-filter`} className="text-eyebrow">
          {m.map.filterPlaces}
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-text"
          />
          <input
            id={`${id}-filter`}
            type="search"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            // Escape empties the field first; only an empty field lets it close the panel.
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.stopPropagation();
                event.preventDefault();
                setQuery("");
              }
            }}
            className="min-h-11 w-full rounded-xl border-2 border-control bg-surface pr-3 pl-9 text-body text-emphasis focus-visible:border-focus focus-visible:outline-offset-[-2px]"
          />
        </div>
      </div>

      {q ? (
        matches.length > 0 ? (
          <ul aria-label={m.map.placesTitle} className="flex flex-col">
            {matches.map((place) => {
              const country = countryOf[place.key];
              return placeButton(place, country && country !== place.key ? labels[country] : undefined);
            })}
          </ul>
        ) : (
          <p role="status" className="px-3 py-2 text-body-sm text-muted-text">
            {m.map.noPlace}
          </p>
        )
      ) : (
        <ul aria-label={m.map.placesTitle} className="flex flex-col">
          {continents.map((continent) => (
            <li key={continent.key}>
              <details className="group/continent">
                <summary className={`${summaryClass} font-semibold`}>
                  {chevron("continent")}
                  {continent.label}
                  {count(continent.count)}
                </summary>
                <ul className="ml-4 flex flex-col border-l-2 border-line pl-2">
                  {continent.countries.map((country) => (
                    <li key={country.key}>
                      <details className="group/country">
                        <summary className={`${summaryClass} text-body-sm`}>
                          {chevron("country")}
                          {country.label}
                          {count(country.count)}
                        </summary>
                        <ul className="ml-4 flex flex-col border-l-2 border-line pl-2">
                          {country.places.map((place) => placeButton(place))}
                        </ul>
                      </details>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
          {others.length > 0 && (
            <li>
              <details className="group/continent">
                <summary className={`${summaryClass} font-semibold`}>
                  {chevron("continent")}
                  {m.map.otherPlaces}
                  {count(countOf(others))}
                </summary>
                <ul className="ml-4 flex flex-col border-l-2 border-line pl-2">
                  {others.map((place) => placeButton(place))}
                </ul>
              </details>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
