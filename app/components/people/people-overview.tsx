import { cn } from "cn";
import { Shuffle } from "lucide-react";
import { useNavigate } from "react-router";

import { InfiniteCanvas } from "~/components/canvas/infinite-canvas";
import { ChapterLayout, ChapterSheet, chapterText } from "~/components/people/chapters";
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
import { readSeen } from "~/lib/preferences";
import { pickRandom } from "~/lib/random";
import type { SearchState } from "~/lib/search/search";
import { markPortraitSourceElement } from "~/lib/view-transition";

export type OverviewView = "canvas" | "list" | "timeline";

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

  // Order, chapters and the random biography: one quiet bar at the top. In the list it
  // sticks (below the rail's width), so the chapters stay one tap away while scrolling.
  const toolbar = (
    <div
      className={cn(
        "flex items-center gap-2",
        view === "list" &&
          "sticky top-2 z-30 rounded-full bg-surface/95 p-1 shadow-sm ring-1 ring-line/70 backdrop-blur-sm lg:top-22 @6xl:static @6xl:bg-transparent @6xl:p-0 @6xl:shadow-none @6xl:ring-0",
      )}
    >
      <SortSelect view={view} value={sort} />
      {view === "list" && <ChapterSheet chapters={chapters} sort={sort} />}
      {siteConfig.features.randomBio && people.length > 0 && (
        <Button
          size="sm"
          variant="secondary"
          onClick={showRandom}
          className="ml-auto"
          aria-label={m.random.label}
        >
          <Shuffle aria-hidden="true" className="size-4" />
          <span aria-hidden="true" className="hidden sm:inline">
            {m.random.label}
          </span>
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
          <TimelineView chapters={chapters} sort={sort} hrefFor={hrefFor} activeSlug={activeSlug} />
        ) : (
          chapters.map((chapter) => (
            <section key={chapter.id} aria-labelledby={chapter.id}>
              <h2
                id={chapter.id}
                tabIndex={-1}
                className="scroll-mt-24 border-b border-brand px-2 pb-2 text-h2 text-brand focus-target lg:scroll-mt-40 @6xl:lg:scroll-mt-28"
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
