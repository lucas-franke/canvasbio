import { useNavigate } from "react-router";

import { InfiniteCanvas } from "~/components/canvas/infinite-canvas";
import { AlphaIndex, letterAnchor } from "~/components/people/alpha-index";
import { PersonRow } from "~/components/people/person-row";
import { RANDOM_BUTTON_BOTTOM, RandomButton } from "~/components/people/random-button";
import { SearchSummary } from "~/components/search/search-summary";
import { siteConfig } from "~/lib/config";
import type { PersonListItem } from "~/lib/content/adapter";
import { groupByLetter } from "~/lib/content/group";
import type { PeopleIndex } from "~/lib/content/people-index";
import { useLocale, useMessages } from "~/lib/i18n";
import { localeConfig } from "~/lib/i18n/locale";
import { readSeen } from "~/lib/preferences";
import { pickRandom } from "~/lib/random";
import type { SearchState } from "~/lib/search/search";
import { markPortraitSourceElement } from "~/lib/view-transition";

export type OverviewView = "canvas" | "list";

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
 * The people overview (portrait wall or A–Z list). Rendered by the people layout so it stays
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

  // "Zufällige Biografie" in the list opens the person directly (among the results, if searching).
  const showRandom = () => {
    const person = pickRandom(hits ?? index.people, { seen: readSeen(), exclude: activeSlug });
    if (!person) return;
    markPortraitSourceElement(document.querySelector(`[data-person="${CSS.escape(person.slug)}"]`));
    navigate(hrefFor(person.slug), { preventScrollReset: true, viewTransition: true });
  };

  // In a language with optional content (Leichte Sprache), mark who has their own text.
  const optionalContent = localeConfig(locale).contentRequired === false;

  const groups = groupByLetter(hits ?? index.people);
  const { tagFacet, tagLabels } = index;

  return (
    <>
      {status}
      {hits && (
        <SearchSummary
          state={search}
          count={hits.length}
          labels={index.facetLabels}
          className="mx-auto mb-6 max-w-[57rem]"
        />
      )}
      {/* Jumping by letter only helps in longer lists (e.g. not for a handful of results). */}
      {(hits ?? index.people).length >= 15 && <AlphaIndex available={new Set(groups.map((g) => g.letter))} />}
      <div className="mx-auto mt-6 flex max-w-[57rem] flex-col gap-10">
        {groups.map(({ letter, items }) => (
          <section key={letter} aria-labelledby={letterAnchor(letter)}>
            <h2
              id={letterAnchor(letter)}
              tabIndex={-1}
              className="scroll-mt-36 border-b border-brand px-2 pb-2 text-h2 text-brand focus-target lg:scroll-mt-60 @xl:scroll-mt-40"
            >
              {letter}
            </h2>
            <ul className="mt-3 flex flex-col gap-1">
              {items.map((person) => (
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
        ))}
      </div>
      {siteConfig.features.randomBio && groups.length > 0 && (
        // Sticks above the nav while the list scrolls (the main column has room for it below).
        <div className={`pointer-events-none sticky z-30 mt-10 flex justify-center ${RANDOM_BUTTON_BOTTOM}`}>
          <RandomButton onClick={showRandom} />
        </div>
      )}
    </>
  );
}
