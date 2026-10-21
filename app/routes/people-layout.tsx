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
import { SPLIT_VIEW_QUERY, useMediaQuery } from "~/lib/hooks";
import { useLocale, useMessages } from "~/lib/i18n";
import { listPath, pagePath } from "~/lib/i18n/locale";
import { filterPeople, isSearchActive, searchSuffix } from "~/lib/search/search";
import { markSeen } from "~/lib/preferences";
import { useSearch } from "~/lib/search/use-search";
import { afterViewTransition, markPortraitTarget } from "~/lib/view-transition";

/** Passed to the detail route via <Outlet context>. */
export interface PeopleLayoutContext {
  closeHref: string;
  modal: boolean;
  /** People in overview order (search results when searching), for previous/next; null while loading. */
  sequence: PersonListItem[] | null;
  hrefFor: (slug: string) => string;
}

/**
 * Shared frame of overview and biography. The overview (portrait wall or list) lives here,
 * so it stays mounted — with its scroll position — while a biography is opened next to it:
 * - from `lg` up the biography is a column on the left and the overview stays usable (split view),
 * - below it covers the screen as a modal dialog; the overview is inert meanwhile.
 */
export default function PeopleLayout() {
  const locale = useLocale();
  const m = useMessages();
  const navigate = useNavigate();
  const { slug } = useParams();
  const leafId = useMatches().at(-1)?.id ?? "";

  const routeView: OverviewView | null = leafId.startsWith("people-list:")
    ? "list"
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
  const overviewHref = (view === "list" ? listPath(locale) : pagePath(locale, "people")) + suffix;

  const { index, failed, retry } = usePeopleIndex(locale);
  const hits = useMemo(
    () =>
      index && isSearchActive(search)
        ? filterPeople(index.people, search, siteConfig.facets, index.facetLabels)
        : null,
    [index, search],
  );
  // Pre-rendered HTML assumes the split view; small screens switch to the dialog after hydration.
  const isSplit = useMediaQuery(SPLIT_VIEW_QUERY, true);
  const modal = isDetail && !isSplit;
  // The canvas fills the screen (also pre-rendered); the list scrolls like a normal page.
  const fullBleed = view === "canvas" && Boolean(index);

  // Modal on small screens: lock page scrolling behind the dialog.
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

  // Opened biographies come up less often under "Zufällige Biografie".
  useEffect(() => {
    if (slug) markSeen(slug);
  }, [slug]);

  const hrefFor = (personSlug: string) => pagePath(locale, "people", personSlug) + suffix;
  const context: PeopleLayoutContext = {
    closeHref: overviewHref,
    modal,
    sequence: hits ?? index?.people ?? null,
    hrefFor,
  };

  // Another person opened in the column: start reading at the top.
  const asideRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    asideRef.current?.scrollTo({ top: 0 });
  }, [slug]);

  return (
    <PageShell
      navEnd={<ViewToggle active={view} />}
      inert={modal}
      fullBleed={fullBleed}
      aside={
        isDetail && (
          <section
            ref={asideRef}
            aria-labelledby={PERSON_HEADING_ID}
            role={modal ? "dialog" : undefined}
            aria-modal={modal || undefined}
            className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-surface [view-transition-name:detail-panel] lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-[min(55%,56rem)] lg:shrink-0 lg:border-r lg:border-line"
          >
            <Outlet context={context} />
          </section>
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
