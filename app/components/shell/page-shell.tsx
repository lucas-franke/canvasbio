import { cn } from "cn";
import { ArrowLeft } from "lucide-react";
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
        "flex justify-center px-4",
        overlay ? "pointer-events-none absolute inset-x-0 top-0 z-10" : "pt-6 sm:pt-10",
      )}
    >
      <Link
        to={pagePath(locale, "start")}
        aria-label={`${localize(siteConfig.brand.wordmark, locale)} – ${m.nav.home}`}
        className={cn(
          "rounded-sm wordmark text-[clamp(1.75rem,1.4rem+1.5vw,2.5rem)] text-brand",
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
    <div className={cn("flex bg-page", fullBleed ? "h-dvh overflow-clip" : "min-h-dvh")}>
      {aside}
      <div className="@container relative flex min-w-0 flex-1 flex-col" inert={inert || undefined}>
        <SiteHeader overlay={fullBleed} />
        {/* Bottom padding keeps the last content and focused elements clear of the fixed nav (WCAG 2.4.11). */}
        <main id="main" className={fullBleed ? "absolute inset-0" : "flex-1 px-4 pt-8 pb-36 sm:px-8"}>
          {children}
        </main>
      </div>
      <BottomNav
        inert={inert}
        label={m.nav.label}
        start={
          <NavPill>
            <NavIconLink
              to={pagePath(locale, "start")}
              label={m.nav.back}
              aria-label={m.nav.backToStart}
              icon={<ArrowLeft />}
              labelSide="end"
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
