import { cn } from "cn";
import { House } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { siteConfig } from "~/lib/config";
import { useLocale, useMessages } from "~/lib/i18n";
import { pagePath } from "~/lib/i18n/locale";
import { localize } from "~/lib/i18n/localize";
import { SearchDrawer } from "~/components/search/search-drawer";
import { MenuDrawer } from "./menu-drawer";
import { BottomNav, NavIconLink, NavPill } from "./nav";

/**
 * Wordmark linking to the start page, centered at the top like in the design.
 * `overlay`: floats above full-bleed content (the canvas) on a label in the page colour.
 */
export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const locale = useLocale();
  const m = useMessages();
  return (
    <header
      className={cn(
        // Next to an open biography the overview column is narrow: the nav pills (with home)
        // are enough there, the wordmark would collide with them.
        "flex justify-center px-4 lg:@max-2xl:hidden",
        overlay
          ? "pointer-events-none absolute inset-x-0 top-0 z-10"
          : // Desktop: a sticky band behind the top navigation, so content doesn't scroll under it.
            "pt-6 sm:pt-10 lg:sticky lg:top-0 lg:z-30 lg:h-24 lg:items-center lg:bg-page/95 lg:pt-0 lg:backdrop-blur-sm",
      )}
    >
      <Link
        to={pagePath(locale, "start")}
        aria-label={`${localize(siteConfig.brand.wordmark, locale)} – ${m.nav.home}`}
        className={cn(
          // Sized by the column (container), which is narrow next to an open biography.
          "rounded-sm wordmark text-[clamp(1.5rem,0.9rem+3cqw,2.5rem)] text-brand",
          overlay &&
            "pointer-events-auto rounded-b-card bg-page px-5 pt-4 pb-3 shadow-[0_2px_4px_rgb(0_0_0/0.15)] sm:px-7 sm:pt-6",
        )}
      >
        {localize(siteConfig.brand.wordmark, locale)}
      </Link>
    </header>
  );
}

interface PageShellProps {
  children: ReactNode;
  /** Extra controls in the right nav pill (view toggle etc.). */
  navEnd?: ReactNode;
  /** Panel shown before the main column, e.g. the biography detail (split view). */
  aside?: ReactNode;
  /** Make header, main content and nav inert (while a modal panel covers them). */
  inert?: boolean;
  /** Main content fills the screen without page scrolling (the canvas); the header floats above it. */
  fullBleed?: boolean;
}

/**
 * Frame for the light content pages: header, main content and the floating bottom navigation.
 * The main column is a size container, so its content adapts to the space left by `aside`.
 */
export function PageShell({ children, navEnd, aside, inert = false, fullBleed = false }: PageShellProps) {
  const locale = useLocale();
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
        <SiteHeader overlay={fullBleed} />
        {/* Bottom padding keeps the last content and focused elements clear of the fixed nav (WCAG 2.4.11). */}
        <main id="main" className={fullBleed ? "absolute inset-0" : "flex-1 px-4 pt-8 pb-36 sm:px-8"}>
          {children}
        </main>
      </div>
      <BottomNav
        inert={inert}
        besideAside={Boolean(aside)}
        label={m.nav.label}
        start={
          <NavPill>
            {/* Very narrow screens with the view switch: no room for both pills in full. Home
                stays reachable through the wordmark at the top and the menu. */}
            <NavIconLink
              to={pagePath(locale, "start")}
              label={m.nav.home}
              icon={<House />}
              labelSide="end"
              className={cn(navEnd && "max-[23rem]:hidden")}
            />
            <MenuDrawer />
          </NavPill>
        }
        end={
          <NavPill>
            {navEnd}
            <SearchDrawer />
          </NavPill>
        }
      />
    </div>
  );
}
