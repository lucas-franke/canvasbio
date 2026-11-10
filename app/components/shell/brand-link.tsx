import { cn } from "cn";
import { Link, useLocation } from "react-router";

import { siteConfig } from "~/lib/config";
import { useLocale, useMessages } from "~/lib/i18n";
import { pagePath } from "~/lib/i18n/locale";
import { localize } from "~/lib/i18n/localize";
import { brandInitials } from "~/lib/brand";

/**
 * The brand as the fixed anchor of the navigation, linking to the start page: the wordmark
 * on every screen size, or the project's own logo (`brand.logo`) instead.
 * It stands free, without a pill, on the pages; a soft glow in the page colour keeps the
 * wordmark readable. Over the mosaic and the map it sits in a nav pill (`contained`) instead.
 * The link's name starts with the visible label (WCAG 2.5.3): "Lauter Frauen – Startseite".
 * `compact`: below 480 px the monogram ("LF") stands in for the wordmark, so the view switch
 * next to it has room for its label. The monogram is the site's logo (it is also the site
 * icon); the link keeps the full name.
 */
export function BrandLink({
  className,
  contained = false,
  compact = false,
}: {
  className?: string;
  contained?: boolean;
  compact?: boolean;
}) {
  const locale = useLocale();
  const m = useMessages();
  const { pathname } = useLocation();
  const home = pagePath(locale, "start");
  const wordmark = localize(siteConfig.brand.wordmark, locale);
  const { logo } = siteConfig.brand;
  const monogram = siteConfig.brand.monogram ?? brandInitials(wordmark);
  const homeSuffix = <span className="sr-only"> – {m.nav.home}</span>;

  return (
    <Link
      to={home}
      aria-current={pathname === home ? "page" : undefined}
      className={cn(
        "hit-44 inline-flex h-10 shrink-0 items-center rounded-full transition-opacity hover:opacity-75",
        className,
      )}
    >
      {logo ? (
        <>
          <img
            src={logo.src}
            alt={localize(logo.alt, locale)}
            width={logo.width}
            height={logo.height}
            className="h-8 w-auto px-2"
          />
          {homeSuffix}
        </>
      ) : (
        <>
          {compact && (
            <span
              aria-hidden="true"
              data-monogram=""
              className="px-3 wordmark text-wordmark whitespace-nowrap text-brand min-[30rem]:hidden"
            >
              {monogram}
            </span>
          )}
          <span
            className={cn(
              "px-2 wordmark text-wordmark whitespace-nowrap text-brand",
              contained
                ? "px-3"
                : "[text-shadow:0_0_6px_var(--c-page),0_0_14px_var(--c-page),0_0_24px_var(--c-page)]",
              compact && "max-[30rem]:sr-only",
            )}
          >
            {wordmark}
          </span>
          {homeSuffix}
        </>
      )}
    </Link>
  );
}
