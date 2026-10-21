import { cn } from "cn";
import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";

import { Button } from "~/components/ui/button";
import { siteConfig } from "~/lib/config";
import { useMessages } from "~/lib/i18n";
import { emptySearch, isSearchActive, type FacetLabels, type SearchState } from "~/lib/search/search";
import { setSearchPanelOpen, useApplySearch } from "~/lib/search/use-search";

interface Filter {
  label: string;
  without: SearchState;
}

/** The active filters as removable chips (name, then facets in config order). */
function activeFilters(state: SearchState, labels: FacetLabels, nameLabel: (q: string) => string): Filter[] {
  const filters: Filter[] = [];
  if (state.q) filters.push({ label: nameLabel(state.q), without: { ...state, q: "" } });
  for (const facet of siteConfig.facets) {
    for (const value of state.facets[facet.key] ?? []) {
      filters.push({
        label: facet.type === "multi" ? (labels[facet.key]?.[value] ?? value) : value,
        without: {
          ...state,
          facets: { ...state.facets, [facet.key]: state.facets[facet.key]!.filter((v) => v !== value) },
        },
      });
    }
  }
  return filters;
}

/** After the last filter is removed, the bar disappears: focus goes back to the search button. */
function focusAfterRemoval(heading: HTMLElement | null, remaining: SearchState) {
  requestAnimationFrame(() => {
    if (isSearchActive(remaining) && heading?.isConnected) heading.focus();
    else document.querySelector<HTMLElement>("[data-search-trigger]")?.focus();
  });
}

interface SearchSummaryProps {
  state: SearchState;
  count: number;
  labels: FacetLabels;
  /** Extra controls next to the title, e.g. previous/next match on the canvas. */
  actions?: ReactNode;
  className?: string;
}

/**
 * "Ergebnisse (n)" with the active filters as removable chips, "Suche ändern" and reset
 * (Figma "Ergebnisse"). Shown above the list and floating on the canvas.
 */
export function SearchSummary({ state, count, labels, actions, className }: SearchSummaryProps) {
  const m = useMessages();
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const applySearch = useApplySearch();
  const filters = activeFilters(state, labels, m.search.nameChip);

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col gap-3 rounded-card bg-surface p-3 text-text shadow-[0_2px_4px_rgb(0_0_0/0.25)] sm:p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2
          ref={heading}
          id={headingId}
          tabIndex={-1}
          className="mr-auto font-sans text-label font-semibold tracking-normal text-emphasis focus-target"
        >
          {count === 0 ? m.search.empty : m.search.results(count)}
        </h2>
        {actions}
        <Button size="sm" variant="outline" onClick={() => setSearchPanelOpen(true)}>
          {m.search.change}
        </Button>
      </div>

      {count === 0 && <p className="text-body-sm">{m.search.emptyHint}</p>}

      <ul className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <li key={filter.label}>
            <button
              type="button"
              aria-label={m.search.removeFilter(filter.label)}
              onClick={() => {
                applySearch(filter.without);
                focusAfterRemoval(heading.current, filter.without);
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-control px-3 text-body-sm font-medium text-emphasis hover:bg-emphasis/5"
            >
              {filter.label}
              <X aria-hidden="true" className="size-4" />
            </button>
          </li>
        ))}
        <li>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              applySearch(emptySearch);
              focusAfterRemoval(null, emptySearch);
            }}
          >
            {m.search.clear}
          </Button>
        </li>
      </ul>
    </section>
  );
}
