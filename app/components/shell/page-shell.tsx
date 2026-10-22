import { cn } from "cn";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { siteConfig } from "~/lib/config";
import { useLocale, useMessages } from "~/lib/i18n";
import { pagePath } from "~/lib/i18n/locale";
import { localize } from "~/lib/i18n/localize";
import { SearchDrawer } from "~/components/search/search-drawer";
import { BrandLink } from "./brand-link";
import { MenuDrawer } from "./menu-drawer";
import { BottomNav, NavPill } from "./nav";

/**
 * Top of the scrolling pages. Desktop: an empty sticky band behind the top navigation, so
 * content doesn't scroll under it (the brand sits in the navigation). Phones and tablets:
 * the wordmark as a small page header that scrolls away (the brand's monogram is in the
 * bottom navigation).
 */
function SiteHeader() {
  const locale = useLocale();
  const m = useMessages();
  const wordmark = localize(siteConfig.brand.wordmark, locale);
  return (
    <header className="flex justify-center px-4 pt-6 sm:pt-8 lg:sticky lg:top-0 lg:z-30 lg:h-20 lg:bg-page/95 lg:pt-0 lg:backdrop-blur-sm">
      <Link
        to={pagePath(locale, "start")}
        aria-label={`${wordmark} – ${m.nav.home}`}
        className="rounded-sm wordmark text-[1.75rem] text-brand lg:hidden"
      >
        {wordmark}
      </Link>
    </header>
  );
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

  return (
    <div
      className={cn(
        "flex bg-page print:block print:h-auto print:overflow-visible",
        fullBleed ? "h-dvh overflow-clip" : "min-h-dvh",
      )}
    >
      {aside}
      {/* Printing a biography prints only the biography, not the overview next to it. */}
      <div
        className={cn("@container relative flex min-w-0 flex-1 flex-col", aside && "print:hidden")}
        inert={inert || undefined}
      >
        {!fullBleed && <SiteHeader />}
        {/* Bottom padding keeps the last content and focused elements clear of the fixed nav (WCAG 2.4.11). */}
        <main id="main" className={fullBleed ? "absolute inset-0" : "flex-1 px-4 pt-8 pb-36 sm:px-8"}>
          {children}
        </main>
      </div>
      <BottomNav
        inert={inert}
        label={m.nav.label}
        start={
          <NavPill bare>
            <BrandLink />
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
    </div>
  );
}
