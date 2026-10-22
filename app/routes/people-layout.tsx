import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Outlet, useMatches, useNavigate, useParams } from "react-router";

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
import { listPath, pagePath, timelinePath } from "~/lib/i18n/locale";
import { filterPeople, isSearchActive, searchSuffix } from "~/lib/search/search";
import { markSeen, useBookmarks } from "~/lib/preferences";
import { useSearch } from "~/lib/search/use-search";
import { useSwipeToClose } from "~/lib/swipe-to-close";
import { afterViewTransition, markPortraitTarget } from "~/lib/view-transition";

/** Passed to the detail route via <Outlet context>. */
export interface PeopleLayoutContext {
  closeHref: string;
  /** People in overview order (search results when searching), for previous/next; null while loading. */
  sequence: PersonListItem[] | null;
  hrefFor: (slug: string) => string;
}

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
  };
  const overviewHref = viewPath[view] + suffix;

  const { index, failed, retry } = usePeopleIndex(locale);
  const [bookmarks] = useBookmarks();
  const hits = useMemo(
    () =>
      index && isSearchActive(search)
        ? filterPeople(index.people, search, siteConfig.facets, index.facetLabels, bookmarks)
        : null,
    [index, search, bookmarks],
  );
  const modal = isDetail;
  // From `lg` the dialog is a centred card (no swipe-down sheet).
  const wide = useMediaQuery(WIDE_QUERY, false);
  // The canvas fills the screen (also pre-rendered); the list scrolls like a normal page.
  const fullBleed = view === "canvas" && Boolean(index);

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

  // Escape closes the biography (unless another dialog, e.g. the menu, handles it).
  useEffect(() => {
    if (!isDetail) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      navigate(overviewHref, { preventScrollReset: true, viewTransition: true });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDetail, navigate, overviewHref]);

  // Portrait morph: name the element it ends on, within the commit (before the new snapshot).
  const transitionSlug = useRef<string | undefined>(slug);
  useLayoutEffect(() => {
    if (slug === transitionSlug.current) return;
    markPortraitTarget(slug, transitionSlug.current);
    transitionSlug.current = slug;
  }, [slug]);

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

  const hrefFor = (personSlug: string) => pagePath(locale, "people", personSlug) + suffix;
  const context: PeopleLayoutContext = {
    closeHref: overviewHref,
    sequence: hits ?? index?.people ?? null,
    hrefFor,
  };

  // Another person opened in the dialog: start reading at the top.
  const asideRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    asideRef.current?.scrollTo({ top: 0 });
  }, [slug]);
  const close = () => navigate(overviewHref, { preventScrollReset: true, viewTransition: true });
  // Phones: swipe the biography sheet down to close it.
  useSwipeToClose(asideRef, modal && !wide, close);

  return (
    <PageShell
      navEnd={<ViewToggle active={view} />}
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
              aria-labelledby={PERSON_HEADING_ID}
              role="dialog"
              aria-modal="true"
              className="relative flex h-full flex-col [view-transition-name:detail-panel] lg:h-auto lg:max-h-[calc(100dvh-4rem)] lg:w-[min(100%,60rem)] lg:overflow-hidden lg:rounded-card lg:bg-surface lg:shadow-[0_24px_64px_rgb(0_0_0/0.35)] print:static print:block print:h-auto print:max-h-none print:w-full print:overflow-visible print:rounded-none print:shadow-none"
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
