import { cn } from "cn";
import { useEffect, useState, type ReactNode } from "react";

import { useMessages } from "~/lib/i18n";
import { SearchDrawer } from "~/components/search/search-drawer";
import { BrandLink } from "./brand-link";
import { MenuDrawer } from "./menu-drawer";
import { TopNav, NavPill } from "./nav";

/**
 * Top of the scrolling pages: room for the floating navigation at the start. No background:
 * the content scrolls on beneath the pills (which carry their own).
 */
function SiteHeader() {
  return <div aria-hidden="true" className="h-[calc(4rem+env(safe-area-inset-top))] shrink-0 sm:h-[calc(5rem+env(safe-area-inset-top))]" />;
}

/** Scrolling this far in one direction counts as a change of direction. */
const TURN = 8;
/** Below this, the navigation always shows (the top of the page). */
const HIDE_AFTER = 120;

/**
 * `scrolled`: the page has left its top (content now runs beneath the navigation).
 * `hidden`: the reader scrolls down, so on phones the navigation makes room; any scroll back
 * up brings it back. Also marked on <html> (`data-nav-hidden`) for bars that stick below it.
 */
function useNavScroll(enabled: boolean): { scrolled: boolean; hidden: boolean } {
  const [state, setState] = useState({ scrolled: false, hidden: false });
  useEffect(() => {
    if (!enabled) return;
    // Furthest point reached in the current direction: lowest while shown, highest while hidden.
    let anchor = window.scrollY;
    let hidden = false;
    const update = () => {
      const y = window.scrollY;
      if (y < HIDE_AFTER) {
        hidden = false;
        anchor = y;
      } else if (hidden ? y > anchor : y < anchor) {
        anchor = y;
      } else if (Math.abs(y - anchor) > TURN) {
        hidden = !hidden;
        anchor = y;
      }
      document.documentElement.toggleAttribute("data-nav-hidden", hidden);
      setState((s) => (s.scrolled === y > 8 && s.hidden === hidden ? s : { scrolled: y > 8, hidden }));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      document.documentElement.removeAttribute("data-nav-hidden");
    };
  }, [enabled]);
  return enabled ? state : { scrolled: false, hidden: false };
}

interface PageShellProps {
  children: ReactNode;
  /** Extra controls at the start of the right nav pill (view switch etc.). */
  navEnd?: ReactNode;
  /** Overlay above the page, e.g. the biography dialog. */
  aside?: ReactNode;
  /** Make header, main content and nav inert (while a modal panel covers them). */
  inert?: boolean;
  /** Main content fills the screen without page scrolling (the canvas); no page header. */
  fullBleed?: boolean;
}

/**
 * Frame for the light content pages: header, main content and the floating navigation.
 * The navigation keeps one order everywhere: the brand (start page) on the left; view,
 * search and menu on the right. The main column is a size container.
 */
export function PageShell({ children, navEnd, aside, inert = false, fullBleed = false }: PageShellProps) {
  const m = useMessages();
  // Over the mosaic and the map, and once a page has scrolled, the brand gets a pill like the
  // controls on the right; at the top of a page it stands free on the page colour.
  const { scrolled, hidden } = useNavScroll(!fullBleed);
  const contained = scrolled || fullBleed;

  return (
    <div
      className={cn(
        "flex bg-page print:block print:h-auto print:overflow-visible",
        fullBleed ? "h-dvh overflow-clip" : "min-h-dvh",
      )}
    >
      {aside}
      {/* First in the DOM, as on screen: Tab and screen readers reach it before the content (WCAG 2.4.3). */}
      <TopNav
        inert={inert}
        hidden={hidden}
        label={m.nav.label}
        start={
          <NavPill bare={!contained}>
            <BrandLink contained={contained} />
          </NavPill>
        }
        end={
          <NavPill>
            {navEnd}
            <SearchDrawer />
            <MenuDrawer />
          </NavPill>
        }
      />
      {/* Printing a biography prints only the biography, not the overview next to it. */}
      <div
        className={cn("@container relative flex min-w-0 flex-1 flex-col", aside && "print:hidden")}
        inert={inert || undefined}
      >
        {!fullBleed && <SiteHeader />}
        <main id="main" className={fullBleed ? "absolute inset-0" : "flex-1 px-4 pt-4 pb-24 sm:px-8 sm:pt-8"}>
          {children}
        </main>
      </div>
    </div>
  );
}
