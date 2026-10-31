import { Shuffle } from "lucide-react";
import { lazy, Suspense } from "react";
import { useNavigate } from "react-router";

import { InfiniteCanvas } from "~/components/canvas/infinite-canvas";
import { ChapterLayout, chapterText } from "~/components/people/chapters";
import { PersonRow } from "~/components/people/person-row";
import { SortSelect } from "~/components/people/sort-select";
import { TimelineView } from "~/components/people/timeline-view";
import { SearchSummary } from "~/components/search/search-summary";
import { Button } from "~/components/ui/button";
import { siteConfig } from "~/lib/config";
import type { PersonListItem } from "~/lib/content/adapter";
import type { PeopleIndex } from "~/lib/content/people-index";
import { chaptersOf, sortFor } from "~/lib/content/sort";
import { useLocale, useMessages } from "~/lib/i18n";
import { localeConfig } from "~/lib/i18n/locale";
import { useHydrated } from "~/lib/hooks";
import { readSeen } from "~/lib/preferences";
import { pickRandom } from "~/lib/random";
import type { SearchState } from "~/lib/search/search";
import { markPortraitSourceElement } from "~/lib/view-transition";

// MapLibre is large: loaded only when the map is opened, and only in the browser.
const PeopleMap = lazy(() => import("~/components/map/people-map"));

export type OverviewView = "canvas" | "list" | "timeline" | "map";

interface PeopleOverviewProps {
  index: PeopleIndex;
  view: OverviewView;
  hrefFor: (slug: string) => string;
  /** Person whose detail is open; highlighted in the overview. */
  activeSlug?: string;
  listHref: string;
  search: SearchState;
  /** People matching the search, or null without a search. */
  hits: PersonListItem[] | null;
}

/**
 * The people overview (portrait wall, A–Z list or timeline). Rendered by the people layout so it stays
 * mounted while a biography is open next to it. Sizes follow the container, not the window,
 * because the overview shares the screen with the detail panel on large screens.
 */
export function PeopleOverview({
  index,
  view,
  hrefFor,
  activeSlug,
  listHref,
  search,
  hits,
}: PeopleOverviewProps) {
  const m = useMessages();
  const locale = useLocale();
  const navigate = useNavigate();
  // Announces the number of results whenever the search changes (WCAG 4.1.3).
  const status = (
    <p role="status" className="sr-only">
      {hits ? m.search.found(hits.length) : ""}
    </p>
  );

  if (view === "canvas") {
    // Pre-rendered with the tiles around the centre; it becomes interactive after hydration.
    // (Without JavaScript the list view is the way to all people.)
    return (
      <>
        {status}
        <InfiniteCanvas
          people={index.people}
          hrefFor={hrefFor}
          activeSlug={activeSlug}
          listHref={listHref}
          search={search}
          hits={hits}
          facetLabels={index.facetLabels}
        />
      </>
    );
  }

  if (view === "map") {
    return (
      <>
        {status}
        <MapView index={index} hits={hits} search={search} hrefFor={hrefFor} activeSlug={activeSlug} />
      </>
    );
  }

  // The random biography button in the list opens the person directly (among the results, if searching).
  const showRandom = () => {
    const person = pickRandom(hits ?? index.people, { seen: readSeen(), exclude: activeSlug });
    if (!person) return;
    markPortraitSourceElement(document.querySelector(`[data-person="${CSS.escape(person.slug)}"]`));
    navigate(hrefFor(person.slug), { preventScrollReset: true, viewTransition: true });
  };

  // In a language with optional content (contentRequired: false), mark who has their own text.
  const optionalContent = localeConfig(locale).contentRequired === false;

  const people = hits ?? index.people;
  const sort = sortFor(view, search.sort);
  const chapters = chaptersOf(people, sort);
  const { tagFacet, tagLabels } = index;

  // Order and the random biography: one quiet line above the content (the chapters are in
  // the index at the right edge).
  const toolbar = (
    <div className="-mb-4 flex items-center justify-between gap-2">
      <SortSelect view={view} value={sort} />
      {siteConfig.features.randomBio && people.length > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={showRandom}
          title={m.random.label}
          className="-mr-3 shrink-0"
        >
          <Shuffle aria-hidden="true" className="size-4" />
          {/* Phones: the symbol only, so the chosen order keeps room. */}
          <span className="sr-only sm:not-sr-only">{m.random.label}</span>
        </Button>
      )}
    </div>
  );

  return (
    <>
      {status}
      <ChapterLayout chapters={chapters} sort={sort}>
        {toolbar}
        {hits && <SearchSummary state={search} count={hits.length} labels={index.facetLabels} />}
        {view === "timeline" ? (
          <TimelineView chapters={chapters} hrefFor={hrefFor} activeSlug={activeSlug} />
        ) : (
          chapters.map((chapter) => (
            <section key={chapter.id} aria-labelledby={chapter.id}>
              <h2
                id={chapter.id}
                tabIndex={-1}
                className="scroll-mt-2 border-b border-brand px-2 pb-2 text-h2 text-brand focus-target"
              >
                {chapterText(chapter, m).heading}
              </h2>
              <ul className="mt-3 flex flex-col gap-1">
                {chapter.items.map((person) => (
                  <li key={person.slug}>
                    <PersonRow
                      person={person}
                      href={hrefFor(person.slug)}
                      active={person.slug === activeSlug}
                      badge={optionalContent && person.textLocale === locale ? m.people.ownText : undefined}
                      tags={(tagFacet ? (person.facets[tagFacet] ?? []) : [])
                        .map((v) => tagLabels[v])
                        .filter(Boolean)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </ChapterLayout>
    </>
  );
}

function MapView({
  index,
  hits,
  search,
  hrefFor,
  activeSlug,
}: Pick<PeopleOverviewProps, "index" | "hits" | "search" | "hrefFor" | "activeSlug">) {
  const m = useMessages();
  // Pre-rendered pages show the loading line; the map itself needs the browser (WebGL).
  const mounted = useHydrated();
  const loading = (
    <p role="status" className="grid h-full place-items-center bg-page text-muted-text">
      {m.map.loading}
    </p>
  );
  if (!mounted) return loading;
  return (
    <Suspense fallback={loading}>
      <PeopleMap
        people={index.people}
        hits={hits}
        search={search}
        placeCoords={index.placeCoords ?? {}}
        facetLabels={index.facetLabels}
        tagLabels={index.tagLabels}
        tagFacet={index.tagFacet}
        hrefFor={hrefFor}
        activeSlug={activeSlug}
      />
    </Suspense>
  );
}
