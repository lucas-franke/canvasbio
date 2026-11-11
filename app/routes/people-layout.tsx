import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useMatches, useNavigate, useParams } from "react-router";

import { LoadFailed } from "~/components/people/load-failed";
import { PeopleOverview, type OverviewView } from "~/components/people/people-overview";
import { PERSON_HEADING_ID } from "~/components/detail/ids";
import { ViewToggle } from "~/components/people/view-toggle";
import { PageShell } from "~/components/shell/page-shell";
import { siteConfig } from "~/lib/config";
import type { PersonListItem } from "~/lib/content/adapter";
import { usePeopleIndex } from "~/lib/content/people-index";
import { WIDE_QUERY, useMediaQuery } from "~/lib/hooks";
import { useLocale, useMessages } from "~/lib/i18n";
import { listPath, mapPath, pagePath, timelinePath } from "~/lib/i18n/locale";
import { sortFor, sortPeople } from "~/lib/content/sort";
import { filterPeople, isSearchActive, searchSuffix } from "~/lib/search/search";
import { markSeen } from "~/lib/preferences";
import { useSearch } from "~/lib/search/use-search";
import { useSwipeToClose } from "~/lib/swipe-to-close";
import { afterViewTransition } from "~/lib/view-transition";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Passed to the detail route via <Outlet context>. */
export interface PeopleLayoutContext {
  closeHref: string;
  /** Closes the biography (on phones after the sheet has slid down). */
  close: () => void;
  /**
   * People in an order the reader chose or sees, for previous/next: list and timeline in
   * their order, search results in any view. Null otherwise (mosaic, map, a direct link).
   */
  sequence: PersonListItem[] | null;
  /** Name of that order ("Name A–Z"), if the view has one. */
  orderLabel: string | null;
  /** Everyone the overview shows (search results when searching), for the random biography; null while loading. */
  pool: PersonListItem[] | null;
  /** Number of search results, or null without a search. */
  resultCount: number | null;
  /** Number of people in the collection; null while loading. */
  total: number | null;
  hrefFor: (slug: string) => string;
}

/** Position of the current entry in the session history (kept by React Router). */
const historyIndex = (): number | null => {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === "number" ? idx : null;
};

/**
 * Shared frame of overview and biography. The overview (portrait wall, list or timeline)
 * lives here, so it stays mounted — with its scroll position — while a biography is open.
 * The biography is a modal dialog over it: a full-screen sheet on phones, a centred card
 * from `lg` (a click on the dimmed backdrop closes it). The overview is inert meanwhile.
 */
export default function PeopleLayout() {
  const locale = useLocale();
  const m = useMessages();
  const navigate = useNavigate();
  const { slug } = useParams();
  const leafId = useMatches().at(-1)?.id ?? "";

  const routeView: OverviewView | null = leafId.startsWith("people-list:")
    ? "list"
    : leafId.startsWith("people-timeline:")
      ? "timeline"
      : leafId.startsWith("people-map:")
        ? "map"
        : leafId.startsWith("people:")
          ? "canvas"
          : null;
  const isDetail = leafId.startsWith("person:");

  // The overview behind a biography keeps whichever view was used last.
  const [lastView, setLastView] = useState<OverviewView>(routeView ?? "canvas");
  if (routeView && routeView !== lastView) setLastView(routeView);
  const view = routeView ?? lastView;

  // The search lives in the URL and travels along on every people link, so it survives
  // opening and closing a biography.
  const search = useSearch();
  const suffix = searchSuffix(search, siteConfig.facets);
  const viewPath = {
    canvas: pagePath(locale, "people"),
    list: listPath(locale),
    timeline: timelinePath(locale),
    map: mapPath(locale),
  };
  const overviewHref = viewPath[view] + suffix;

  const { index, failed, retry } = usePeopleIndex(locale);
  const hits = useMemo(
    () =>
      index && isSearchActive(search)
        ? filterPeople(index.people, search, siteConfig.facets, index.facetLabels)
        : null,
    [index, search],
  );
  const modal = isDetail;

  // The history entry of the overview a biography was opened from. Closing goes back to it
  // instead of adding an entry, so the back button never reopens what was just closed.
  // Unknown (null) when the biography is the first people page of the visit.
  const { key: locationKey } = useLocation();
  const overviewEntry = useRef<number | null>(null);
  useEffect(() => {
    if (!isDetail) overviewEntry.current = historyIndex();
  }, [isDetail, locationKey]);
  // From `lg` the dialog is a centred card (no swipe-down sheet).
  const wide = useMediaQuery(WIDE_QUERY, false);
  // Canvas and map fill the screen (the canvas also pre-rendered); the list scrolls like a normal page.
  const fullBleed = (view === "canvas" || view === "map") && Boolean(index);

  // Lock page scrolling behind the dialog.
  useEffect(() => {
    if (!modal) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [modal]);

  // Focus: opening a biography moves focus to its name, closing returns it to the person
  // in the overview (WCAG 2.4.3). Nothing moves on the initial page load. Waits for the
  // view transition, so focus lands on the final page.
  const previousSlug = useRef<string | undefined>(slug);
  useEffect(() => {
    const previous = previousSlug.current;
    previousSlug.current = slug;
    if (slug && slug !== previous) {
      afterViewTransition(() => document.getElementById(PERSON_HEADING_ID)?.focus({ preventScroll: true }));
    } else if (!slug && previous) {
      afterViewTransition(() =>
        document.querySelector<HTMLElement>(`[data-person="${CSS.escape(previous)}"]`)?.focus(),
      );
    }
  }, [slug]);

  // Opened biographies come up less often as a random biography.
  useEffect(() => {
    if (slug) markSeen(slug);
  }, [slug]);

  // Previous/next in the biography only follow an order the reader chose or sees: list and
  // timeline in their order, search results in any view. The mosaic's and the map's own order
  // means nothing to a reader, so there is no previous/next from there.
  const pool = hits ?? index?.people ?? null;
  const ordered = routeView === null && (view === "list" || view === "timeline");
  const sequence = useMemo(() => {
    if (!pool) return null;
    if (view === "list" || view === "timeline") return sortPeople(pool, sortFor(view, search.sort));
    return hits ? pool : null;
  }, [pool, hits, view, search.sort]);
  const orderLabel = ordered ? m.sort[sortFor(view as "list" | "timeline", search.sort)] : null;

  // Phones: the sheet slides up when a biography opens (not on a page load) and back down
  // before it closes, from wherever a swipe left it. No view transition there (see
  // app/lib/view-transition.ts); wide screens use the transition's card animation instead.
  const sheetRef = useRef<HTMLElement>(null);
  const wasDetail = useRef(isDetail);
  const closing = useRef(false);
  const animateSheet = !wide && typeof window !== "undefined" && !prefersReducedMotion();
  useLayoutEffect(() => {
    if (isDetail && !wasDetail.current && animateSheet) {
      sheetRef.current?.animate([{ transform: "translateY(100%)" }, { transform: "none" }], {
        duration: 380,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    }
    wasDetail.current = isDetail;
    closing.current = false;
  }, [isDetail, animateSheet]);

  // Phones: the sheet covers the overview completely, so the wall behind loads no portraits
  // (~500 KB on a biography opened directly) until the sheet is pulled or starts closing.
  const [revealed, setRevealed] = useState(false);
  if (!isDetail && revealed) setRevealed(false);
  const covered = modal && !wide && !revealed;

  const close = () => {
    setRevealed(true);
    const leave = () => {
      const here = historyIndex();
      const origin = overviewEntry.current;
      // Back to the overview's own entry (also past biographies opened one after another) …
      if (origin !== null && here !== null && origin < here) return navigate(origin - here);
      // … or, without one, the overview takes this entry's place.
      return navigate(overviewHref, { replace: true, preventScrollReset: true, viewTransition: true });
    };
    const sheet = sheetRef.current;
    if (!sheet || !animateSheet) return leave();
    if (closing.current) return;
    closing.current = true;
    sheet
      .animate([{ transform: "none" }, { transform: "translateY(100%)" }], {
        duration: 260,
        easing: "cubic-bezier(0.4, 0, 1, 1)",
        fill: "forwards",
      })
      .finished.then(leave, leave);
  };
  const closeRef = useRef(close);
  const detailOpen = useRef(isDetail);
  useLayoutEffect(() => {
    closeRef.current = close;
    detailOpen.current = isDetail;
  });

  // Escape closes the biography (unless another dialog, e.g. the menu, handles it). The
  // listener is always there and asks whether a biography is open: attached only once one
  // has opened, it missed a key pressed right as the dialog appeared.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!detailOpen.current || event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      closeRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const hrefFor = (personSlug: string) => pagePath(locale, "people", personSlug) + suffix;
  const context: PeopleLayoutContext = {
    closeHref: overviewHref,
    close,
    sequence,
    orderLabel,
    pool,
    resultCount: hits ? hits.length : null,
    total: index ? index.people.length : null,
    hrefFor,
  };

  // Another person opened in the dialog: start reading at the top. Not on the first one: a
  // link to a section ("#geschichte") has already scrolled there.
  const asideRef = useRef<HTMLDivElement>(null);
  const shownSlug = useRef(slug);
  useLayoutEffect(() => {
    if (shownSlug.current && slug && shownSlug.current !== slug) asideRef.current?.scrollTo({ top: 0 });
    shownSlug.current = slug;
  }, [slug]);
  // Phones: swipe the biography sheet down to close it.
  useSwipeToClose(asideRef, modal && !wide, close, () => setRevealed(true));

  return (
    <PageShell
      navEnd={<ViewToggle active={view} />}
      homeIcon
      inert={modal}
      fullBleed={fullBleed}
      aside={
        isDetail && (
          <div className="fixed inset-0 z-50 lg:grid lg:place-items-center lg:p-8 print:static print:block print:p-0">
            {/* Backdrop: a click outside the card closes it. Keyboard users close with Escape or
                the close button in the dialog, so the backdrop itself needs no key handling. */}
            <div
              aria-hidden="true"
              onClick={close}
              className="absolute inset-0 hidden bg-stage/55 backdrop-blur-sm lg:block print:hidden"
            />
            {/* The card clips to its rounded corners; the scrolling happens inside it, so the
                scrollbar stays within the card (browsers don't round scrollbars themselves). */}
            <section
              ref={sheetRef}
              aria-labelledby={PERSON_HEADING_ID}
              role="dialog"
              aria-modal="true"
              className="relative flex h-full flex-col [view-transition-name:detail-panel] lg:h-auto lg:max-h-[calc(100dvh-4rem)] lg:w-[min(100%,60rem)] lg:overflow-hidden lg:rounded-card lg:bg-surface lg:shadow-dialog print:static print:block print:h-auto print:max-h-none print:w-full print:overflow-visible print:rounded-none print:shadow-none"
            >
              <div
                ref={asideRef}
                className="detail-scroller min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface lg:my-2 print:my-0 print:overflow-visible"
              >
                <Outlet context={context} />
              </div>
            </section>
          </div>
        )
      }
    >
      {!isDetail && <Outlet context={context} />}
      {index ? (
        <PeopleOverview
          index={index}
          view={view}
          activeSlug={slug}
          hrefFor={hrefFor}
          listHref={listPath(locale) + suffix}
          search={search}
          hits={hits}
          covered={covered}
        />
      ) : failed ? (
        <LoadFailed onRetry={retry} />
      ) : (
        <p role="status" className="py-16 text-center text-muted-text">
          {m.detail.loadingOverview}
        </p>
      )}
    </PageShell>
  );
}
